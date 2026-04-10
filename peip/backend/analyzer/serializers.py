from rest_framework import serializers
from .models import AnalysisReport


class AnalysisReportSerializer(serializers.ModelSerializer):
    file_analysis = serializers.SerializerMethodField()
    commit_trend = serializers.SerializerMethodField()
    top_risky_files = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisReport
        fields = [
            'id', 'repo_url', 'repo_name', 'created_at',
            'overall_health_score', 'risk_level', 'total_commits',
            'total_files', 'bug_fix_ratio', 'avg_complexity',
            'predicted_failure_probability', 'estimated_cost_of_inaction',
            'ceo_report', 'file_analysis', 'commit_trend', 'top_risky_files'
        ]

    def get_file_analysis(self, obj):
        return obj.get_file_analysis()

    def get_commit_trend(self, obj):
        return obj.get_commit_trend()

    def get_top_risky_files(self, obj):
        return obj.get_top_risky_files()