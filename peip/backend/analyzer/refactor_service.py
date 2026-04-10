import ast
import re
from pathlib import Path
from .ollama_service import query_ollama


def detect_dead_code(source: str, filepath: str) -> list:
    """Detect unused functions, variables, and imports using AST."""
    issues = []

    if not filepath.endswith('.py'):
        return issues

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return issues

    defined_functions = {}
    defined_imports = {}
    defined_variables = {}
    all_used_names = set()

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if not node.name.startswith('_'):
                defined_functions[node.name] = node.lineno

        elif isinstance(node, ast.Import):
            for alias in node.names:
                name = alias.asname or alias.name.split('.')[0]
                defined_imports[name] = node.lineno

        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                name = alias.asname or alias.name
                defined_imports[name] = node.lineno

        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    defined_variables[target.id] = node.lineno

        elif isinstance(node, ast.Name):
            all_used_names.add(node.id)

        elif isinstance(node, ast.Attribute):
            all_used_names.add(node.attr)

    for name, lineno in defined_imports.items():
        if name not in all_used_names and name != '*':
            issues.append({
                'type': 'dead_import',
                'name': name,
                'line': lineno,
                'severity': 'low',
                'message': f"Unused import '{name}' — can be safely removed",
                'category': 'Dead Code'
            })

    for name, lineno in defined_functions.items():
        if name not in all_used_names:
            issues.append({
                'type': 'dead_function',
                'name': name,
                'line': lineno,
                'severity': 'medium',
                'message': f"Function '{name}()' is defined but never called",
                'category': 'Dead Code'
            })

    for name, lineno in defined_variables.items():
        if name not in all_used_names and not name.startswith('_'):
            issues.append({
                'type': 'dead_variable',
                'name': name,
                'line': lineno,
                'severity': 'low',
                'message': f"Variable '{name}' is assigned but never used",
                'category': 'Dead Code'
            })

    return issues


def detect_code_smells(source: str, filepath: str) -> list:
    """Detect common code smells."""
    issues = []

    if not filepath.endswith('.py'):
        return _detect_js_smells(source, filepath)

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return issues

    lines = source.split('\n')

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_lines = getattr(node, 'end_lineno', node.lineno) - node.lineno
            if func_lines > 50:
                issues.append({
                    'type': 'long_function',
                    'name': node.name,
                    'line': node.lineno,
                    'severity': 'high',
                    'message': f"{node.name}() too long ({func_lines} lines)",
                    'category': 'Code Smell'
                })

            if len(node.args.args) > 5:
                issues.append({
                    'type': 'too_many_args',
                    'name': node.name,
                    'line': node.lineno,
                    'severity': 'medium',
                    'message': f"{node.name}() has too many parameters",
                    'category': 'Code Smell'
                })

        if isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
            depth = _get_nesting_depth(node, tree)
            if depth > 4:
                issues.append({
                    'type': 'deep_nesting',
                    'line': node.lineno,
                    'severity': 'high',
                    'message': f"Deep nesting ({depth})",
                    'category': 'Code Smell'
                })

    magic_number_pattern = re.compile(r'\b\d{4,}\b')
    for i, line in enumerate(lines, 1):
        matches = magic_number_pattern.findall(line)
        for match in matches:
            issues.append({
                'type': 'magic_number',
                'line': i,
                'severity': 'low',
                'message': f"Magic number {match}",
                'category': 'Code Smell'
            })

    return issues


def _detect_js_smells(source: str, filepath: str) -> list:
    issues = []
    lines = source.split('\n')

    for i, line in enumerate(lines, 1):
        if "console." in line:
            issues.append({
                'type': 'console_log',
                'line': i,
                'severity': 'low',
                'message': "console.log found",
                'category': 'Code Smell'
            })

        if re.match(r'\s*var\s+', line):
            issues.append({
                'type': 'var_usage',
                'line': i,
                'severity': 'medium',
                'message': "Use let/const instead of var",
                'category': 'Code Smell'
            })

    return issues[:20]


def _get_nesting_depth(target_node, tree) -> int:
    depth = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
            for child in ast.walk(node):
                if child is target_node:
                    depth += 1
    return depth


def get_refactor_suggestion(filepath: str, source_snippet: str, issue: dict) -> str:
    system = """You are an expert software engineer.
Provide:
PROBLEM:
BEFORE:
AFTER:
BENEFIT:
"""

    prompt = f"""
File: {filepath}
Issue: {issue['message']}

Code:
{source_snippet}
"""

    return query_ollama(prompt, system)


def analyze_file_for_refactoring(repo_path: str, file_path: str) -> dict:
    full_path = Path(repo_path) / file_path

    try:
        source = full_path.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        return {'error': str(e), 'issues': []}

    lines = source.split('\n')

    dead_code_issues = detect_dead_code(source, file_path)
    smell_issues = detect_code_smells(source, file_path)
    all_issues = dead_code_issues + smell_issues

    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    all_issues.sort(key=lambda x: severity_order.get(x['severity'], 3))

    top_issues = all_issues[:5]

    for issue in top_issues:
        line_num = issue.get('line', 1)
        snippet = '\n'.join(lines[max(0, line_num-3): line_num+5])
        issue['ai_suggestion'] = get_refactor_suggestion(
            file_path, snippet, issue
        )

    return {
        'file_path': file_path,
        'total_issues': len(all_issues),
        'issues': all_issues,
        'top_issues': top_issues
    }