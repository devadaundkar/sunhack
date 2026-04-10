from django.db import models
import json

class AnalysisReport(models.Model):
    repo_url = models.URLField()
    repo_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    overall_health_score = models.FloatField(default=0)
    risk_level = models.CharField(max_length=20, default='unknown')
    total_commits = models.IntegerField(default=0)
    total_files = models.IntegerField(default=0)
    bug_fix_ratio = models.FloatField(default=0)
    avg_complexity = models.FloatField(default=0)
    predicted_failure_probability = models.FloatField(default=0)
    estimated_cost_of_inaction = models.FloatField(default=0)
    file_analysis_json = models.TextField(default='[]')
    ceo_report = models.TextField(default='')
    commit_trend_json = models.TextField(default='[]')
    top_risky_files_json = models.TextField(default='[]')

    def get_file_analysis(self):
        return json.loads(self.file_analysis_json)

    def get_commit_trend(self):
        return json.loads(self.commit_trend_json)

    def get_top_risky_files(self):
        return json.loads(self.top_risky_files_json)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.repo_name} - {self.created_at.strftime('%Y-%m-%d')}"