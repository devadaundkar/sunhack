from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import json
import threading

from .models import AnalysisReport
from .serializers import AnalysisReportSerializer
from .github_service import clone_or_update_repo, get_repo_meta
from .pydriller_service import analyze_repository
from .radon_service import analyze_codebase_complexity
from .ollama_service import generate_ceo_report, predict_risk_score, generate_file_insight

# In-memory job tracker
analysis_jobs = {}


class AnalyzeRepoView(APIView):
    def post(self, request):
        repo_url = request.data.get('repo_url', '').strip()
        if not repo_url:
            return Response({'error': 'repo_url is required'}, status=400)

        job_id = repo_url.replace('/', '_').replace(':', '')
        analysis_jobs[job_id] = {'status': 'running', 'progress': 0, 'message': 'Starting...'}

        thread = threading.Thread(
            target=_run_analysis,
            args=(repo_url, job_id),
            daemon=True
        )
        thread.start()

        return Response({'job_id': job_id, 'status': 'started'})


class JobStatusView(APIView):
    def get(self, request, job_id):
        job = analysis_jobs.get(job_id)
        if not job:
            return Response({'error': 'Job not found'}, status=404)
        return Response(job)


class ReportListView(APIView):
    def get(self, request):
        reports = AnalysisReport.objects.all()[:20]
        serializer = AnalysisReportSerializer(reports, many=True)
        return Response(serializer.data)


class ReportDetailView(APIView):
    def get(self, request, pk):
        try:
            report = AnalysisReport.objects.get(pk=pk)
        except AnalysisReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        serializer = AnalysisReportSerializer(report)
        return Response(serializer.data)


class FileInsightView(APIView):
    def post(self, request):
        file_data = request.data.get('file_data', {})
        if not file_data:
            return Response({'error': 'file_data required'}, status=400)
        insight = generate_file_insight(file_data)
        return Response({'insight': insight})


class OllamaStatusView(APIView):
    def get(self, request):
        import requests as req
        try:
            r = req.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=3)
            models = [m['name'] for m in r.json().get('models', [])]
            return Response({'status': 'online', 'models': models, 'current': settings.OLLAMA_MODEL})
        except Exception:
            return Response({'status': 'offline', 'models': [], 'current': settings.OLLAMA_MODEL})


def _run_analysis(repo_url: str, job_id: str):
    """Background thread that runs the full analysis pipeline."""
    try:
        def update(msg, progress):
            analysis_jobs[job_id] = {**analysis_jobs.get(job_id, {}), 'status': 'running', 'message': msg, 'progress': progress}

        update('Cloning repository...', 10)
        clone_path = clone_or_update_repo(repo_url)
        meta = get_repo_meta(repo_url)

        update('Analyzing commit history with PyDriller...', 25)
        commit_data = analyze_repository(str(clone_path))

        update('Measuring code complexity with Radon...', 50)
        complexity_data = analyze_codebase_complexity(str(clone_path))

        update('Computing risk scores with AI...', 65)
        metrics = {
            'bug_fix_ratio': commit_data['bug_fix_ratio'],
            'avg_complexity': complexity_data['average_complexity'],
            'high_complexity_file_count': len(complexity_data['high_complexity_files']),
            'total_commits': commit_data['total_commits'],
            'unique_authors': commit_data['unique_authors'],
        }
        risk = predict_risk_score(metrics)

        # Merge file data
        commit_files = {f['path']: f for f in commit_data['file_stats']}
        complexity_files = {f['path']: f for f in complexity_data['file_complexity']}

        merged_files = []
        all_paths = set(commit_files.keys()) | set(complexity_files.keys())
        for path in all_paths:
            cf = commit_files.get(path, {})
            rf = complexity_files.get(path, {})
            merged = {
                'path': path,
                'change_count': cf.get('change_count', 0),
                'bug_fix_count': cf.get('bug_fix_count', 0),
                'bug_ratio': cf.get('bug_ratio', 0),
                'churn': cf.get('churn', 0),
                'last_modified': cf.get('last_modified', 'N/A'),
                'authors': cf.get('authors', []),
                'complexity': rf.get('complexity', 0),
                'complexity_rank': rf.get('complexity_rank', 'A'),
                'maintainability_index': rf.get('maintainability_index', 100),
                'loc': rf.get('loc', 0),
                'functions': rf.get('functions', []),
            }
            # Composite risk score
            merged['risk_score'] = (
                merged['bug_ratio'] * 40 +
                min(merged['change_count'] / 10, 30) +
                min(merged['complexity'] * 2, 30)
            )
            merged_files.append(merged)

        merged_files.sort(key=lambda x: -x['risk_score'])
        top_risky = merged_files[:10]

        update('Generating CEO report with Ollama...', 80)
        ceo_input = {
            'repo_name': f"{meta['owner']}/{meta['repo']}",
            'health_score': risk.get('health_score', 50),
            'risk_level': risk.get('risk_level', 'medium'),
            'total_files': complexity_data['total_files_analyzed'],
            'total_commits': commit_data['total_commits'],
            'bug_fix_ratio': commit_data['bug_fix_ratio'],
            'avg_complexity': complexity_data['average_complexity'],
            'top_risky_files': [f['path'] for f in top_risky[:3]],
            'failure_probability': risk.get('failure_probability', 0.3),
        }
        ceo_report = generate_ceo_report(ceo_input)

        update('Saving report...', 95)
        report = AnalysisReport.objects.create(
            repo_url=repo_url,
            repo_name=f"{meta['owner']}/{meta['repo']}",
            overall_health_score=risk.get('health_score', 50),
            risk_level=risk.get('risk_level', 'medium'),
            total_commits=commit_data['total_commits'],
            total_files=complexity_data['total_files_analyzed'],
            bug_fix_ratio=commit_data['bug_fix_ratio'],
            avg_complexity=complexity_data['average_complexity'],
            predicted_failure_probability=risk.get('failure_probability', 0.3),
            estimated_cost_of_inaction=risk.get('estimated_monthly_cost_usd', 0),
            file_analysis_json=json.dumps(merged_files),
            ceo_report=ceo_report,
            commit_trend_json=json.dumps(commit_data['commit_trend']),
            top_risky_files_json=json.dumps(top_risky),
        )

        analysis_jobs[job_id] = {
            'status': 'complete',
            'progress': 100,
            'message': 'Analysis complete!',
            'report_id': report.id
        }

    except Exception as e:
        analysis_jobs[job_id] = {
            'status': 'error',
            'progress': 0,
            'message': str(e)
        }


class RefactorFileView(APIView):
    """Analyze a single file for refactoring opportunities."""
    def post(self, request):
        repo_id = request.data.get('report_id')
        file_path = request.data.get('file_path', '').strip()

        if not repo_id or not file_path:
            return Response({'error': 'report_id and file_path required'}, status=400)

        try:
            report = AnalysisReport.objects.get(pk=repo_id)
        except AnalysisReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=404)

        # Re-derive the clone path from the repo URL
        from .github_service import clone_or_update_repo
        clone_path = clone_or_update_repo(report.repo_url)

        from .refactor_service import analyze_file_for_refactoring
        result = analyze_file_for_refactoring(str(clone_path), file_path)

        return Response(result)


class RefactorSummaryView(APIView):
    """Get refactoring summary for top risky files in a report."""
    def post(self, request):
        repo_id = request.data.get('report_id')
        if not repo_id:
            return Response({'error': 'report_id required'}, status=400)

        try:
            report = AnalysisReport.objects.get(pk=repo_id)
        except AnalysisReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=404)

        from .github_service import clone_or_update_repo
        from .refactor_service import analyze_file_for_refactoring

        clone_path = clone_or_update_repo(report.repo_url)
        top_files = report.get_top_risky_files()[:5]  # analyze top 5 risky files

        results = []
        for f in top_files:
            path = f.get('path', '')
            if path.endswith(('.py', '.js', '.ts', '.jsx', '.tsx')):
                result = analyze_file_for_refactoring(str(clone_path), path)
                results.append(result)

        return Response({
            'repo_name': report.repo_name,
            'files_analyzed': len(results),
            'total_issues': sum(r.get('total_issues', 0) for r in results),
            'results': results
        })