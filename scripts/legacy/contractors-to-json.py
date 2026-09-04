#!/usr/bin/env python3
"""Converts a "Контрагенты" export from the old XAF system
(zakaz.fototeca.kz -> Справочники -> Контрагенты -> Экспорт контрагента)
into a flat JSON array that scripts/migrate-legacy-contractors.ts can read.

Unlike the orders journal export (scripts/legacy/xlsx-to-json.py, which
comes out as .xlsx), this grid's export comes out as an old-style .xls
file, hence the separate xlrd-based reader here rather than openpyxl.

Usage:
    python3 scripts/legacy/contractors-to-json.py path/to/Контрагенты.xls path/to/output.json

Expected columns (as exported by the grid, in this order — the script
reads by header name, not position, so a reordered export still works):
    Наименование, (blank icon column), Код, Электронная почта, Имя входа,
    Сумма на счете, Телефон, VK, Facebook, Instagram

The grid's export interleaves group-header rows (e.g. "Группа: ... (Кол-во:
N)") among the actual contractor rows — recognizable because they have no
value in "Код" — which this script skips.
"""

import json
import re
import sys

import xlrd

PHONE_RE = re.compile(r"\d+")


def normalize_phone(raw) -> str | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, float) and raw.is_integer():
        # xlrd reads numeric-looking phone cells as float (e.g. 77772737777.0);
        # str()'ing that directly leaves a stray trailing "0" from ".0" once
        # the decimal point is stripped below, corrupting the number.
        raw = int(raw)
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    if digits.startswith("7") and len(digits) == 10:
        digits = "7" + digits
    if len(digits) != 11 or not digits.startswith("7"):
        return None
    return digits


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    return text or None


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    src, dst = sys.argv[1], sys.argv[2]

    wb = xlrd.open_workbook(src)
    sh = wb.sheet_by_index(0)

    header = [str(sh.cell_value(0, c)).strip() for c in range(sh.ncols)]
    col = {name: i for i, name in enumerate(header) if name}

    required = ["Наименование", "Код", "Телефон"]
    missing = [c for c in required if c not in col]
    if missing:
        print(f"Export is missing expected columns: {missing}. Found: {header}")
        sys.exit(1)

    # The "Наименование" header's own column is always blank in this
    # export — the actual contractor display name lives in the very next
    # (unlabeled, icon) column instead. Confirmed by inspecting real rows:
    # column "Наименование" is empty for all 1361 contractors, while the
    # column right after it holds names like " Назарбек ".
    name_col = col["Наименование"] + 1

    def get(row, name):
        i = col.get(name)
        if i is None or i >= sh.ncols:
            return None
        return sh.cell_value(row, i)

    out = []
    for r in range(1, sh.nrows):
        code = get(r, "Код")
        if code in (None, ""):
            continue  # group-header row, not a real contractor

        name = clean(sh.cell_value(r, name_col) if name_col < sh.ncols else None)
        login = clean(get(r, "Имя входа"))
        email = clean(get(r, "Электронная почта"))
        phone = normalize_phone(get(r, "Телефон"))

        out.append(
            {
                "code": clean(code),
                "name": name,
                "login": login,
                "email": email,
                "phone": phone,
            }
        )

    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=None)

    with_phone = sum(1 for r in out if r["phone"])
    with_email = sum(1 for r in out if r["email"])
    with_name = sum(1 for r in out if r["name"])
    print(f"Wrote {len(out)} rows to {dst}")
    print(f"  {with_phone} rows ({100 * with_phone // max(len(out), 1)}%) have a parseable phone number")
    print(f"  {with_email} rows ({100 * with_email // max(len(out), 1)}%) have an email")
    print(f"  {with_name} rows ({100 * with_name // max(len(out), 1)}%) have a name")


if __name__ == "__main__":
    main()
