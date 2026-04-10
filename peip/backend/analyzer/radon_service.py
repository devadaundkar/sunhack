import os
from radon.complexity import cc_visit, cc_rank
from radon.metrics import mi_visit
from radon.raw import analyze
from pathlib import Path


SUPPORTED_EXTENSIONS = {'.py', '.js', '.ts', '.jsx', '.tsx'}


def analyze_codebase_complexity(repo_path: str) -> dict:
    """
    Run Radon analysis on all supported files in the repo.
    Returns per-file complexity scores and maintainability index.
    """
    results = []
    total_complexity = 0
    total_files = 0
    total_loc = 0
    high_complexity_files = []

    repo = Path(repo_path)

    for filepath in repo.rglob('*'):
        # Skip hidden dirs, node_modules, venv
        parts = filepath.parts
        if any(p.startswith('.') or p in ('node_modules', 'venv', '__pycache__', 'dist', 'build') for p in parts):
            continue

        if filepath.suffix not in SUPPORTED_EXTENSIONS:
            continue

        try:
            source = filepath.read_text(encoding='utf-8', errors='ignore')
            rel_path = str(filepath.relative_to(repo))

            file_result = {
                'path': rel_path,
                'extension': filepath.suffix,
                'complexity': 0,
                'complexity_rank': 'A',
                'maintainability_index': 100,
                'loc': 0,
                'functions': []
            }

            # Raw metrics
            try:
                raw = analyze(source)
                file_result['loc'] = raw.lloc
                total_loc += raw.lloc
            except Exception:
                pass

            # Cyclomatic complexity (Python only)
            if filepath.suffix == '.py':
                try:
                    blocks = cc_visit(source)
                    if blocks:
                        avg_cc = sum(b.complexity for b in blocks) / len(blocks)
                        file_result['complexity'] = round(avg_cc, 2)
                        file_result['complexity_rank'] = cc_rank(avg_cc)
                        file_result['functions'] = [
                            {
                                'name': b.name,
                                'complexity': b.complexity,
                                'rank': cc_rank(b.complexity)
                            }
                            for b in sorted(blocks, key=lambda x: -x.complexity)[:5]
                        ]
                        total_complexity += avg_cc
                except Exception:
                    pass

                # Maintainability Index
                try:
                    mi = mi_visit(source, multi=True)
                    file_result['maintainability_index'] = round(mi, 1)
                except Exception:
                    pass
            else:
                # For JS/TS: estimate complexity by counting keywords
                keywords = ['if ', 'else ', 'for ', 'while ', 'switch ', 'catch ', '&&', '||', '? ']
                est = sum(source.count(k) for k in keywords)
                est_cc = min(est / max(file_result['loc'], 1) * 10, 30)
                file_result['complexity'] = round(est_cc, 2)
                file_result['complexity_rank'] = cc_rank(est_cc)
                total_complexity += est_cc

            total_files += 1
            results.append(file_result)

            if file_result['complexity'] > 10:
                high_complexity_files.append(file_result)

        except Exception as e:
            continue

    avg_complexity = total_complexity / max(total_files, 1)

    return {
        'total_files_analyzed': total_files,
        'total_loc': total_loc,
        'average_complexity': round(avg_complexity, 2),
        'high_complexity_files': sorted(high_complexity_files, key=lambda x: -x['complexity'])[:10],
        'file_complexity': results,
        'complexity_distribution': _get_distribution(results),
    }


def _get_distribution(results):
    dist = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0}
    for r in results:
        rank = r.get('complexity_rank', 'A')
        if rank in dist:
            dist[rank] += 1
    return dist