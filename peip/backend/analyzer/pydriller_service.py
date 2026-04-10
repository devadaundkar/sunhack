from pydriller import Repository
from datetime import datetime, timedelta
from collections import defaultdict
import re


BUG_KEYWORDS = re.compile(
    r'\b(fix|bug|error|crash|issue|fail|broken|hotfix|patch|revert|defect|regression)\b',
    re.IGNORECASE
)


def analyze_repository(repo_path: str, days: int = 180):
    """
    Analyze commit history using PyDriller.
    Returns structured data about commits, bug patterns, file changes.
    """
    since = datetime.now() - timedelta(days=days)
    
    file_stats = defaultdict(lambda: {
        'change_count': 0,
        'bug_fix_count': 0,
        'authors': set(),
        'last_modified': None,
        'lines_added': 0,
        'lines_deleted': 0,
        'commits': []
    })
    
    commit_timeline = []
    total_commits = 0
    bug_commits = 0
    author_set = set()

    try:
        for commit in Repository(repo_path, since=since).traverse_commits():
            total_commits += 1
            author_set.add(commit.author.name)
            is_bug_fix = bool(BUG_KEYWORDS.search(commit.msg or ''))
            if is_bug_fix:
                bug_commits += 1

            commit_timeline.append({
                'hash': commit.hash[:8],
                'date': commit.committer_date.strftime('%Y-%m-%d'),
                'author': commit.author.name,
                'is_bug_fix': is_bug_fix,
                'files_changed': len(commit.modified_files),
                'message': (commit.msg or '')[:100]
            })

            for mod in commit.modified_files:
                fname = mod.new_path or mod.old_path or 'unknown'
                fs = file_stats[fname]
                fs['change_count'] += 1
                fs['authors'].add(commit.author.name)
                fs['last_modified'] = commit.committer_date.strftime('%Y-%m-%d')
                fs['lines_added'] += mod.added_lines or 0
                fs['lines_deleted'] += mod.deleted_lines or 0
                if is_bug_fix:
                    fs['bug_fix_count'] += 1
                fs['commits'].append(commit.hash[:8])

    except Exception as e:
        print(f"PyDriller error: {e}")

    # Convert sets to lists for JSON serialization
    file_list = []
    for path, stats in file_stats.items():
        stats['authors'] = list(stats['authors'])
        stats['path'] = path
        stats['bug_ratio'] = (
            stats['bug_fix_count'] / stats['change_count']
            if stats['change_count'] > 0 else 0
        )
        stats['churn'] = stats['lines_added'] + stats['lines_deleted']
        file_list.append(stats)

    # Commit trend by week
    weekly = defaultdict(lambda: {'total': 0, 'bugs': 0})
    for c in commit_timeline:
        week = c['date'][:7]  # YYYY-MM
        weekly[week]['total'] += 1
        if c['is_bug_fix']:
            weekly[week]['bugs'] += 1

    commit_trend = [
        {'month': k, 'commits': v['total'], 'bugs': v['bugs']}
        for k, v in sorted(weekly.items())
    ]

    return {
        'total_commits': total_commits,
        'bug_fix_commits': bug_commits,
        'bug_fix_ratio': bug_commits / max(total_commits, 1),
        'unique_authors': len(author_set),
        'file_stats': file_list,
        'commit_trend': commit_trend,
        'commit_timeline': commit_timeline[-50:],  # Last 50
    }