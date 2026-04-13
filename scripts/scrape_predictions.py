#!/usr/bin/env python3
"""
Scrape NPB commentator predictions from ohtashp.com for 2023-2026.

Outputs: companies/npb-predictions/data/commentator_predictions.json

Uses only Python standard library (urllib, html.parser).
"""

import json
import os
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

URLS = {
    "2026": "https://www.ohtashp.com/topics/baseball_yosou/index.html",
    "2025": "https://www.ohtashp.com/topics/baseball_yosou/index2025.html",
    "2024": "https://www.ohtashp.com/topics/baseball_yosou/index2024.html",
    "2023": "https://www.ohtashp.com/topics/baseball_yosou/index2023.html",
}

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

# Team name normalisation: half-width katakana and abbreviations -> canonical
TEAM_NORM = {
    # Half-width katakana forms
    "ｿﾌﾄﾊﾞﾝｸ": "ソフトバンク",
    "ｵﾘｯｸｽ": "オリックス",
    "ﾔｸﾙﾄ": "ヤクルト",
    # Already full-width but just in case
    "ソフトバンク": "ソフトバンク",
    "オリックス": "オリックス",
    "ヤクルト": "ヤクルト",
    # With whitespace variants
    "阪神": "阪神",
    "巨人": "巨人",
    "DeNA": "DeNA",
    "広島": "広島",
    "中日": "中日",
    "日本ハム": "日本ハム",
    "日本ﾊﾑ": "日本ハム",
    "楽天": "楽天",
    "西武": "西武",
    "ロッテ": "ロッテ",
    # Abbreviated single-kanji forms (used in 2023 TV show tables)
    "巨": "巨人",
    "神": "阪神",
    "横": "DeNA",
    "広": "広島",
    "ヤ": "ヤクルト",
    "中": "中日",
    "ソ": "ソフトバンク",
    "鷹": "ソフトバンク",
    "ハ": "日本ハム",
    "日": "日本ハム",
    "オ": "オリックス",
    "楽": "楽天",
    "西": "西武",
    "ロ": "ロッテ",
}

CENTRAL_TEAMS = {"阪神", "巨人", "DeNA", "広島", "ヤクルト", "中日"}
PACIFIC_TEAMS = {"ソフトバンク", "日本ハム", "オリックス", "楽天", "西武", "ロッテ"}


VARIANT_RE = re.compile(r"^(.+?)\s*([①②③④⑤⑥⑦⑧⑨⑩]+)\s*$")

# Date pattern at the start of 出所 cell: "M/D" or "MM/DD"
SOURCE_DATE_RE = re.compile(r"^(\d{1,2}/\d{1,2})\s*(.*)$")

# Date in parentheses at the end: "MediaName(M/D)"
SOURCE_PAREN_DATE_RE = re.compile(r"^(.+?)\s*\((\d{1,2}/\d{1,2})\)\s*$")


def split_variant(name: str) -> tuple[str, str | None]:
    """Split circled-number variant suffix from a commentator name.

    >>> split_variant("里崎智也①")
    ("里崎智也", "①")
    >>> split_variant("高木豊")
    ("高木豊", None)
    """
    m = VARIANT_RE.match(name)
    if m:
        return m.group(1).strip(), m.group(2)
    return name, None


def parse_source_field(raw: str) -> tuple[str | None, str | None]:
    """Parse the 出所 (source) field into (source_name, date).

    Row-format (2024-2026) examples:
        "12/30中日新聞 『…』"  -> ("中日新聞", "12/30")
        "1/1YouTube 『Satozaki ch…』" -> ("YouTube", "1/1")
        ""  -> (None, None)

    Column-format (2023) examples:
        "YTube(11/18)" -> ("YTube", "11/18")
        "朝日(1/1)"    -> ("朝日", "1/1")
        "ラミレス"       -> (None, None)  -- this is a name, not a source
    """
    text = raw.strip()
    if not text:
        return None, None

    # Try column-format first: "MediaName(M/D)"
    m = SOURCE_PAREN_DATE_RE.match(text)
    if m:
        return m.group(1).strip(), m.group(2)

    # Try row-format: "M/D MediaName 『title』"
    m = SOURCE_DATE_RE.match(text)
    if m:
        date = m.group(1)
        rest = m.group(2).strip()
        # Extract media name: everything before 『 or the link text
        # Rest could be: "中日新聞 『…』" or "YouTube 『Satozaki ch…』"
        if "『" in rest:
            source_name = rest.split("『")[0].strip()
        elif "[" in rest:
            source_name = rest.split("[")[0].strip()
        else:
            source_name = rest
        # Clean trailing punctuation
        source_name = source_name.rstrip("、。 ")
        return source_name if source_name else None, date

    return None, None


def normalise_team(raw: str) -> str:
    """Normalise a raw team name string to canonical form."""
    t = raw.strip().replace("\u3000", "").replace("\xa0", "").strip()
    if t in TEAM_NORM:
        return TEAM_NORM[t]
    # Try stripping trailing whitespace chars
    for key, val in TEAM_NORM.items():
        if t.startswith(key) or t.endswith(key):
            return val
    return t


def classify_league(teams: list[str]) -> str | None:
    """Given a list of normalised team names, determine if central or pacific."""
    team_set = set(teams)
    central_overlap = len(team_set & CENTRAL_TEAMS)
    pacific_overlap = len(team_set & PACIFIC_TEAMS)
    if central_overlap > pacific_overlap:
        return "central"
    elif pacific_overlap > central_overlap:
        return "pacific"
    return None


# ---------------------------------------------------------------------------
# HTML table parser
# ---------------------------------------------------------------------------

class TableExtractor(HTMLParser):
    """Extract all <table> elements as nested lists of rows/cells."""

    def __init__(self):
        super().__init__()
        self.tables: list[dict] = []  # [{caption, rows: [[{tag, text, colspan}]]}]
        self._in_table = 0
        self._in_caption = False
        self._current_caption = ""
        self._in_row = False
        self._in_cell = False
        self._cell_tag = ""
        self._cell_text = ""
        self._cell_colspan = 1
        self._current_row: list[dict] = []
        self._current_rows: list[list[dict]] = []
        self._table_stack: list[dict] = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "table":
            self._in_table += 1
            self._table_stack.append({
                "caption": "",
                "rows": [],
            })
            self._current_rows = self._table_stack[-1]["rows"]
            self._current_caption = ""
        elif tag == "caption" and self._in_table:
            self._in_caption = True
            self._current_caption = ""
        elif tag == "tr" and self._in_table:
            self._in_row = True
            self._current_row = []
        elif tag in ("th", "td") and self._in_row:
            self._in_cell = True
            self._cell_tag = tag
            self._cell_text = ""
            colspan = attrs_dict.get("colspan", "1")
            try:
                self._cell_colspan = int(colspan)
            except ValueError:
                self._cell_colspan = 1

    def handle_endtag(self, tag):
        if tag == "caption" and self._in_caption:
            self._in_caption = False
            if self._table_stack:
                self._table_stack[-1]["caption"] = self._current_caption
        elif tag in ("th", "td") and self._in_cell:
            self._in_cell = False
            self._current_row.append({
                "tag": self._cell_tag,
                "text": self._cell_text.strip(),
                "colspan": self._cell_colspan,
            })
        elif tag == "tr" and self._in_row:
            self._in_row = False
            if self._current_row and self._table_stack:
                self._table_stack[-1]["rows"].append(self._current_row)
        elif tag == "table" and self._in_table:
            self._in_table -= 1
            if self._table_stack:
                finished = self._table_stack.pop()
                self.tables.append(finished)

    def handle_data(self, data):
        if self._in_caption:
            self._current_caption += data
        elif self._in_cell:
            self._cell_text += data

    def handle_entityref(self, name):
        if self._in_cell:
            self._cell_text += f"&{name};"
        elif self._in_caption:
            self._current_caption += f"&{name};"

    def handle_charref(self, name):
        if self._in_cell:
            try:
                self._cell_text += chr(int(name))
            except ValueError:
                self._cell_text += f"&#{name};"
        elif self._in_caption:
            try:
                self._current_caption += chr(int(name))
            except ValueError:
                self._current_caption += f"&#{name};"


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

def fetch_page(url: str) -> str:
    """Fetch a URL and return decoded HTML."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Parsing: row-oriented format (2024-2026)
# ---------------------------------------------------------------------------

def parse_row_format(tables: list[dict]) -> dict:
    """
    Parse the row-oriented format used in 2024-2026.
    Each table has rows: header, (昨年順位), then commentator rows.
    We pick the first 'セ・リーグ' and 'パ・リーグ' master tables.
    """
    result = {"central": [], "pacific": []}

    for table in tables:
        cap = table["caption"]
        # Skip non-prediction tables
        if "番外編" in cap or "ジャンク" in cap:
            continue
        if "順位変動" in cap or "オープン戦" in cap or "交流戦" in cap:
            continue

        # Determine league from caption
        if "セ" in cap and "順位予想" in cap:
            league = "central"
        elif "パ" in cap and "順位予想" in cap:
            league = "pacific"
        else:
            continue

        # Only take the first master table per league
        if result[league]:
            continue

        rows = table["rows"]
        if len(rows) < 3:
            continue

        for row in rows:
            # Skip header rows and metadata rows
            if not row:
                continue

            # Check first cell: should be th with commentator name
            first = row[0]
            name = first["text"].strip()

            # Skip header/metadata rows
            if not name or name in ("解説者", "　解説者　"):
                continue
            if name.startswith("(") or name.startswith("（"):
                continue
            if "順位" in name or "OP戦" in name:
                continue

            # Extract team names from td cells and source from last cell
            td_cells = [cell for cell in row[1:] if cell["tag"] == "td"]

            # Separate team cells from source cell
            # Teams are valid team names; the last cell is likely 出所
            teams = []
            source_text = ""
            for cell in td_cells:
                team = normalise_team(cell["text"])
                if team in CENTRAL_TEAMS or team in PACIFIC_TEAMS:
                    teams.append(team)
                else:
                    # Non-team cell — likely 出所 (source)
                    source_text = cell["text"].strip()

            if len(teams) == 6:
                base_name, variant = split_variant(name)
                source, date = parse_source_field(source_text)
                result[league].append({
                    "name": base_name,
                    "variant": variant,
                    "rankings": teams,
                    "source": source,
                    "date": date,
                })

    return result


# ---------------------------------------------------------------------------
# Parsing: column-oriented format (2023)
# ---------------------------------------------------------------------------

def parse_column_format(tables: list[dict]) -> dict:
    """
    Parse the column-oriented (transposed) format used in 2023.
    Row 0: header with source info (may have colspan)
    Row 1: commentator names
    Rows 2-7: rank 1-6 with team names
    Row 8 (optional): 備考
    """
    result = {"central": [], "pacific": []}
    # Track commentator names we've already added (to handle duplicates across sub-tables)
    seen_central = set()
    seen_pacific = set()

    for table in tables:
        cap = table["caption"]
        # Skip non-prediction tables
        if "番外編" in cap or "おもしろ" in cap:
            continue
        if "順位変動" in cap or "オープン戦" in cap or "交流戦" in cap:
            continue
        if "順位表" in cap:
            continue

        # Determine league from caption
        if "セ" in cap and "順位予想" in cap:
            league_from_cap = "central"
        elif "パ" in cap and "順位予想" in cap:
            league_from_cap = "pacific"
        else:
            continue

        rows = table["rows"]
        if len(rows) < 7:
            continue

        # Row 0 contains source info: expand colspans to align with columns
        # First cell is a label (e.g. "順位"), rest are source info per column
        source_row_raw = rows[0]
        source_cells_expanded: list[str] = []
        for cell in source_row_raw:
            text = cell["text"].strip()
            colspan = cell.get("colspan", 1)
            source_cells_expanded.extend([text] * colspan)

        # Row 1 contains commentator names (th cells, NO label column)
        name_row = rows[1]
        names_expanded: list[str] = []
        for cell in name_row:
            text = cell["text"].strip()
            colspan = cell.get("colspan", 1)
            names_expanded.extend([text] * colspan)

        # Row 0 has a label in position 0 ("順位"), then data columns,
        # possibly ending with "（最終順位）".
        # Row 1 has NO label — it starts directly with commentator names.
        # So source_infos[i] corresponds to names[i].
        source_infos = source_cells_expanded[1:]  # skip "順位" label
        # Remove trailing "（最終順位）" or empty from source_infos
        while source_infos and ("最終順位" in source_infos[-1] or not source_infos[-1]):
            source_infos.pop()

        # Filter out non-commentator names like "最終順位" or "AERA dot." duplicates
        names = [n for n in names_expanded if n and n != "最終順位"]

        if not names:
            continue

        # Rows 2-7 contain rank data
        rank_rows = []
        for row in rows[2:]:
            # Check if first cell is a rank indicator
            if not row:
                continue
            first_text = row[0]["text"].strip()
            if first_text in ("優勝", "1位"):
                rank_rows.append(row)
            elif first_text in ("2位", "3位", "4位", "5位", "6位"):
                rank_rows.append(row)
            # Also handle "備考" -> stop
            if first_text == "備考":
                break

        if len(rank_rows) < 6:
            # Try to be more lenient: sometimes 優勝 is used for 1位
            pass

        if len(rank_rows) < 6:
            continue

        # Extract teams per commentator (transpose)
        # Each rank_row has: th (rank label), then td cells for each commentator
        # The last td might be "最終順位"
        num_commentators = len(names)

        for col_idx in range(num_commentators):
            commentator_name = names[col_idx]
            rankings = []

            for rank_row in rank_rows[:6]:
                # Get td cells
                tds = [cell for cell in rank_row if cell["tag"] == "td"]
                if col_idx < len(tds):
                    team = normalise_team(tds[col_idx]["text"])
                    rankings.append(team)

            if len(rankings) != 6:
                continue

            # Validate: all teams should be from the same league
            valid_teams = [t for t in rankings if t in CENTRAL_TEAMS or t in PACIFIC_TEAMS]
            if len(valid_teams) != 6:
                continue

            # Determine actual league from team data (caption might be wrong)
            actual_league = classify_league(rankings)
            if actual_league is None:
                actual_league = league_from_cap

            seen = seen_central if actual_league == "central" else seen_pacific
            if commentator_name in seen:
                continue
            seen.add(commentator_name)

            # Extract source info from Row 0
            source_raw = source_infos[col_idx] if col_idx < len(source_infos) else ""
            source, date = parse_source_field(source_raw)

            # Split variant from name
            base_name, variant = split_variant(commentator_name)

            result[actual_league].append({
                "name": base_name,
                "variant": variant,
                "rankings": rankings,
                "source": source,
                "date": date,
            })

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_dir = os.path.join(project_dir, "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "commentator_predictions.json")

    all_data = {}

    for year, url in sorted(URLS.items()):
        print(f"Fetching {year}: {url}")
        html = fetch_page(url)

        parser = TableExtractor()
        parser.feed(html)
        tables = parser.tables

        print(f"  Found {len(tables)} tables")

        if year == "2023":
            data = parse_column_format(tables)
        else:
            data = parse_row_format(tables)

        print(f"  Central: {len(data['central'])} commentators")
        print(f"  Pacific: {len(data['pacific'])} commentators")

        all_data[year] = data

        # Be polite: small delay between requests
        time.sleep(0.5)

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"\nOutput written to: {output_path}")

    # Summary
    total = 0
    for year, data in sorted(all_data.items()):
        c = len(data["central"])
        p = len(data["pacific"])
        total += c + p
        print(f"  {year}: Central={c}, Pacific={p}")
    print(f"  Total predictions: {total}")


if __name__ == "__main__":
    main()
