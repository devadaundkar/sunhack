import os
import shutil
import subprocess
from pathlib import Path
from django.conf import settings


def clone_or_update_repo(repo_url: str) -> Path:
    """Clone a public GitHub/GitLab repo or update if already cloned."""
    # Derive folder name from URL
    repo_name = repo_url.rstrip('/').split('/')[-1].replace('.git', '')
    owner = repo_url.rstrip('/').split('/')[-2]
    folder_name = f"{owner}__{repo_name}"
    clone_path = settings.REPO_CLONE_DIR / folder_name

    if clone_path.exists():
        # Pull latest
        try:
            subprocess.run(
                ['git', '-C', str(clone_path), 'pull'],
                capture_output=True, timeout=60
            )
        except Exception:
            shutil.rmtree(clone_path)
            _clone(repo_url, clone_path)
    else:
        _clone(repo_url, clone_path)

    return clone_path


def _clone(repo_url: str, clone_path: Path):
    subprocess.run(
        ['git', 'clone', '--depth', '200', repo_url, str(clone_path)],
        capture_output=True, timeout=120, check=True
    )


def get_repo_meta(repo_url: str) -> dict:
    """Extract owner and repo name from URL."""
    parts = repo_url.rstrip('/').split('/')
    return {
        'owner': parts[-2],
        'repo': parts[-1].replace('.git', ''),
        'host': 'github' if 'github' in repo_url else 'gitlab'
    }