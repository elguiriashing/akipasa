#!/usr/bin/env python3
"""Audit SQL migration files for explicit Data API privileges and RLS.

Usage: python3 scripts/audit_sql_migration_permissions.py supabase/migrations/*.sql
Exit 1 if any CREATE TABLE lacks a matching ENABLE RLS or explicit privilege
statement in its own migration. Existing historical migrations can be reviewed
separately; CI should pass newly introduced/modified SQL paths.
"""
import pathlib
import re
import sys

CREATE = re.compile(r'\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(?P<table>(?:"?[\w]+"?\.)?"?[\w]+"?)\s*\(', re.I)
def normalize(name):
    return name.replace('"', '').lower().split('.')[-1]

def audit(path):
    sql = pathlib.Path(path).read_text(encoding='utf-8')
    # Remove comments to avoid matching commented-out SQL.
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.S)
    sql = re.sub(r'--[^\n]*', '', sql)
    problems = []
    for match in CREATE.finditer(sql):
        table = normalize(match.group('table'))
        identifier = r'(?:[\w"]+\.)?["]?' + re.escape(table) + r'["]?'
        rls = re.search(r'\balter\s+table\s+' + identifier + r'\s+enable\s+row\s+level\s+security\b', sql, re.I)
        privilege = re.search(r'\b(?:grant|revoke)\s+[^;]*?\bon\s+(?:table\s+)?' + identifier + r'\b', sql, re.I | re.S)
        if not rls:
            problems.append(f'{table}: missing ENABLE ROW LEVEL SECURITY')
        if not privilege:
            problems.append(f'{table}: missing explicit GRANT/REVOKE')
        if rls and not re.search(r'\bcreate\s+policy\b[^;]*?\bon\s+' + identifier + r'\b', sql, re.I | re.S):
            problems.append(f'{table}: no CREATE POLICY found (verify intentional deny-all)')
    return problems

def main():
    paths = [pathlib.Path(p) for p in sys.argv[1:]]
    if not paths:
        print('Pass SQL migration paths as arguments', file=sys.stderr)
        return 2
    failures = 0
    for path in paths:
        for issue in audit(path):
            print(f'{path}: {issue}')
            failures += 1
    print(f'Audited {len(paths)} migration(s): {failures} finding(s)')
    return int(failures > 0)

if __name__ == '__main__':
    sys.exit(main())
