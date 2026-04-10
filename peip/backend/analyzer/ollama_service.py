import requests
import json
from django.conf import settings


def query_ollama(prompt: str, system: str = '') -> str:
    """Send a prompt to Ollama and return the response text."""
    url = f"{settings.OLLAMA_BASE_URL}/api/generate"
    
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "top_p": 0.9,
            "num_predict": 1500,
        }
    }

    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return data.get('response', '').strip()
    except requests.exceptions.ConnectionError:
        return "⚠️ Ollama is not running. Start it with: ollama serve"
    except Exception as e:
        return f"⚠️ AI analysis unavailable: {str(e)}"


def generate_ceo_report(analysis_data: dict) -> str:
    """Generate a non-technical CEO report using Ollama."""
    system = """You are a senior technology risk consultant presenting to a non-technical CEO.
    Write in plain English. Use dollar amounts, time estimates, and business impact language.
    Avoid jargon. Be direct and actionable. Structure the report clearly."""

    prompt = f"""
Based on this engineering data, write a CEO Executive Report:

REPOSITORY: {analysis_data['repo_name']}
OVERALL HEALTH SCORE: {analysis_data['health_score']}/100
RISK LEVEL: {analysis_data['risk_level'].upper()}
TOTAL CODE FILES: {analysis_data['total_files']}
TOTAL COMMITS (6 months): {analysis_data['total_commits']}
BUG FIX RATIO: {analysis_data['bug_fix_ratio']*100:.1f}% of commits were bug fixes
AVERAGE CODE COMPLEXITY: {analysis_data['avg_complexity']}/10 (higher = harder to maintain)
TOP 3 RISKY FILES: {', '.join(analysis_data['top_risky_files'][:3])}
PREDICTED FAILURE PROBABILITY (90 days): {analysis_data['failure_probability']*100:.0f}%

Write a 4-section report:
1. **Executive Summary** (2-3 sentences, overall situation)
2. **Key Risks** (3 bullet points, business impact focused)
3. **Cost of Inaction** (specific time/money estimates based on risk level)
4. **Recommended Actions** (3 prioritized actions with timeline)

Keep it under 400 words. Make it feel urgent but not alarmist.
"""
    return query_ollama(prompt, system)


def generate_file_insight(file_data: dict) -> str:
    """Generate AI insight for a specific risky file."""
    system = "You are a senior software architect. Give concise, actionable technical advice."
    
    prompt = f"""
Analyze this file's risk profile and give a 2-sentence recommendation:

File: {file_data['path']}
Change frequency: {file_data.get('change_count', 0)} times in 6 months  
Bug fix ratio: {file_data.get('bug_ratio', 0)*100:.0f}%
Complexity score: {file_data.get('complexity', 0)}
Lines of code: {file_data.get('loc', 0)}

What is the likely root cause and the single most important action?
"""
    return query_ollama(prompt, system)


def predict_risk_score(metrics: dict) -> dict:
    """Use Ollama to interpret metrics and give a risk assessment."""
    system = "You are a software reliability engineer. Respond ONLY with valid JSON, no explanation."
    
    prompt = f"""
Given these engineering metrics, return a JSON object:

Metrics:
- bug_fix_ratio: {metrics.get('bug_fix_ratio', 0):.2f}
- avg_complexity: {metrics.get('avg_complexity', 0):.2f}
- high_complexity_file_count: {metrics.get('high_complexity_file_count', 0)}
- total_commits: {metrics.get('total_commits', 0)}
- unique_authors: {metrics.get('unique_authors', 1)}

Return ONLY this JSON (no markdown):
{{
  "failure_probability": <float 0.0 to 1.0>,
  "risk_level": "<low|medium|high|critical>",
  "estimated_dev_hours_lost_per_month": <integer>,
  "estimated_monthly_cost_usd": <integer>,
  "health_score": <integer 0-100>
}}
"""
    raw = query_ollama(prompt, system)
    
    try:
        # Clean up potential markdown fences
        clean = raw.replace('```json', '').replace('```', '').strip()
        return json.loads(clean)
    except Exception:
        # Fallback heuristic calculation
        bfr = metrics.get('bug_fix_ratio', 0)
        cc = metrics.get('avg_complexity', 1)
        health = max(0, min(100, int(100 - (bfr * 40) - (cc * 3))))
        fp = min(0.95, bfr * 0.5 + cc * 0.03)
        
        if health > 75:
            risk = 'low'
        elif health > 50:
            risk = 'medium'
        elif health > 25:
            risk = 'high'
        else:
            risk = 'critical'
        
        return {
            'failure_probability': round(fp, 2),
            'risk_level': risk,
            'estimated_dev_hours_lost_per_month': int(fp * 80),
            'estimated_monthly_cost_usd': int(fp * 80 * 150),
            'health_score': health
        }