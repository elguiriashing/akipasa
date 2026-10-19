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


def normalize(name: str) -> str:
    return name.replace('"', "").lower().split(".")[-1]


def audit(path: pathlib.Path) -> list[str]:
    sql = path.read_text(encoding="utf-8")
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    sql = re.sub(r"--[^\n]*", "", sql)
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
        privilege = re.search(
            r"\b(?:grant|revoke)\s+[^;]*?\bon\s+(?:table\s+)?"
            + identifier
            + r"\b",
            sql,
            re.I | re.S,
        )
        if not rls:
            problems.append(f"{table}: missing ENABLE ROW LEVEL SECURITY")
        if not privilege:
            problems.append(f"{table}: missing explicit GRANT/REVOKE")
    return problems


def main() -> int:
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
