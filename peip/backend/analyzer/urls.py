from django.urls import path
from . import views

urlpatterns = [
    path('analyze/', views.AnalyzeRepoView.as_view(), name='analyze'),
    path('job/<str:job_id>/', views.JobStatusView.as_view(), name='job-status'),
    path('reports/', views.ReportListView.as_view(), name='report-list'),
    path('reports/<int:pk>/', views.ReportDetailView.as_view(), name='report-detail'),
    path('file-insight/', views.FileInsightView.as_view(), name='file-insight'),
    path('ollama-status/', views.OllamaStatusView.as_view(), name='ollama-status'),
    # NEW REFACTORING ENDPOINTS
    path('refactor/file/', views.RefactorFileView.as_view(), name='refactor-file'),
    path('refactor/summary/', views.RefactorSummaryView.as_view(), name='refactor-summary'),
]