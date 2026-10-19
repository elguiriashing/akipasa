#!/usr/bin/env python3
"""Fail when a table-creating migration omits explicit grants or RLS."""

import pathlib
import re
import sys

CREATE = re.compile(
    r"\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?"
    r"(?P<table>(?:\"?[\w]+\"?\.)?\"?[\w]+\"?)\s*\(",
    re.I,
)
PRIVILEGE = re.compile(
    r"\b(?:grant|revoke)\s+[^;]*?\bon\s+(?:table\s+)?"
    r"(?P<targets>[^;]*?)\s+\b(?:to|from)\b",
    re.I | re.S,
)


def normalize(name: str) -> str:
    return name.replace('"', "").lower().split(".")[-1]


def audit_sql(sql: str) -> list[str]:
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    sql = re.sub(r"--[^\n]*", "", sql)
    privileged_tables = {
        normalize(re.sub(r"^only\s+", "", target.strip(), flags=re.I))
        for statement in PRIVILEGE.finditer(sql)
        for target in statement.group("targets").split(",")
    }
    problems: list[str] = []
    for match in CREATE.finditer(sql):
        table = normalize(match.group("table"))
        identifier = r'(?:[\w"]+\.)?[\"]?' + re.escape(table) + r'[\"]?'
        rls = re.search(
            r"\balter\s+table\s+"
            + identifier
            + r"\s+enable\s+row\s+level\s+security\b",
            sql,
            re.I,
        )
        if not rls:
            problems.append(f"{table}: missing ENABLE ROW LEVEL SECURITY")
        if table not in privileged_tables:
            problems.append(f"{table}: missing explicit GRANT/REVOKE")
    return problems


def audit(path: pathlib.Path) -> list[str]:
    return audit_sql(path.read_text(encoding="utf-8"))


def self_test() -> None:
    grouped = """
      create table public.first_table(id integer);
      create table public.second_table(id integer);
      alter table public.first_table enable row level security;
      alter table public.second_table enable row level security;
      revoke all on table public.first_table, public.second_table
        from public, anon, authenticated;
    """
    assert audit_sql(grouped) == []
    assert audit_sql(grouped.replace(", public.second_table", "")) == [
        "second_table: missing explicit GRANT/REVOKE"
    ]


def main() -> int:
    if sys.argv[1:] == ["--self-test"]:
        self_test()
        print("SQL permission audit self-test passed")
        return 0
    paths = [pathlib.Path(value) for value in sys.argv[1:]]
    if not paths:
        print("Pass SQL migration paths as arguments", file=sys.stderr)
        return 2
    findings = [(path, item) for path in paths for item in audit(path)]
    for path, item in findings:
        print(f"{path}: {item}")
    print(f"Audited {len(paths)} migration(s): {len(findings)} finding(s)")
    return int(bool(findings))


if __name__ == "__main__":
    raise SystemExit(main())
