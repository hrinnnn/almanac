"""Fetch a Douban user's public book / movie / music marks into data/marks.json.

Usage:
    python3 fetch.py            # incremental: stop paging once known items appear
    python3 fetch.py --full     # re-fetch everything
"""
import argparse
import html
import json
import random
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

USER_ID = "242876980"
CATEGORIES = ["movie", "book", "music"]
STATUSES = ["collect", "wish", "do"]
PAGE_SIZE = 30
DATA = Path(__file__).parent / "data" / "marks.json"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)

session = requests.Session()
session.headers.update({
    "User-Agent": UA,
    "Accept": "text/html",
    "Accept-Language": "zh-CN,zh;q=0.9",
})


def get(url, referer):
    for attempt in range(5):
        r = session.get(url, headers={"Referer": referer}, timeout=20)
        if r.status_code == 200:
            return r.text
        wait = 5 * (attempt + 1) + random.random() * 5
        print(f"  HTTP {r.status_code}, retry in {wait:.0f}s", file=sys.stderr)
        time.sleep(wait)
    raise RuntimeError(f"failed: {url}")


def parse_page(text, category, status):
    soup = BeautifulSoup(text, "html.parser")
    items = []
    for li in soup.select("ul.list-view li.item"):
        a = li.select_one(".title a")
        sid = re.search(r"/subject/(\d+)", a["href"]).group(1)
        rating_span = li.select_one(".date span[class^=rating]")
        rating = int(re.search(r"rating(\d)", rating_span["class"][0]).group(1)) if rating_span else None
        date_m = re.search(r"\d{4}-\d{2}-\d{2}", li.select_one(".date").get_text())
        intro = li.select_one(".intro")
        comment = li.select_one(".comment")
        items.append({
            "id": sid,
            "category": category,
            "status": status,
            "title": " ".join(a.get_text().split()),
            "url": a["href"],
            "rating": rating,
            "date": date_m.group(0) if date_m else None,
            "intro": html.unescape(intro.get_text().strip()) if intro else "",
            "comment": comment.get_text().strip() if comment else "",
        })
    total_m = re.search(r'data-total-page="(\d+)"', text)
    count_m = re.search(r"<title>[^<]*?\((\d+)\)", text)
    if total_m:
        total_pages = int(total_m.group(1))
    elif count_m:
        total_pages = -(-int(count_m.group(1)) // PAGE_SIZE)
    else:
        total_pages = 1
    return items, total_pages


def fetch_list(category, status, known_ids):
    base = f"https://{category}.douban.com/people/{USER_ID}/{status}"
    out, start, total_pages = [], 0, None
    while True:
        url = f"{base}?start={start}&sort=time&rating=all&filter=all&mode=list"
        items, total_pages = parse_page(get(url, f"https://{category}.douban.com/"), category, status)
        page_no = start // PAGE_SIZE + 1
        print(f"  {category}/{status} page {page_no}/{total_pages}: {len(items)} items")
        out.extend(items)
        if known_ids is not None and items and all(i["id"] in known_ids for i in items):
            return out, False
        if not items or page_no >= total_pages:
            return out, True
        start += PAGE_SIZE
        time.sleep(1.5 + random.random() * 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true")
    args = ap.parse_args()

    old = json.loads(DATA.read_text()) if DATA.exists() and not args.full else {"items": []}
    old_by_key = {(i["category"], i["status"], i["id"]): i for i in old["items"]}

    merged = []
    for category in CATEGORIES:
        for status in STATUSES:
            known = {k[2] for k in old_by_key if k[0] == category and k[1] == status}
            fresh, complete = fetch_list(category, status, known if not args.full else None)
            seen = {i["id"] for i in fresh}
            merged.extend(fresh)
            if not complete:
                merged.extend(v for k, v in old_by_key.items()
                              if k[0] == category and k[1] == status and k[2] not in seen)
            time.sleep(2 + random.random() * 2)

    # an item moved from wish -> collect should only appear once, as collect
    collected = {(i["category"], i["id"]) for i in merged if i["status"] == "collect"}
    merged = [i for i in merged if i["status"] == "collect" or (i["category"], i["id"]) not in collected]

    previous = json.loads(DATA.read_text())["items"] if DATA.exists() else None
    if merged == previous:
        print("no changes")
    else:
        DATA.parent.mkdir(parents=True, exist_ok=True)
        DATA.write_text(json.dumps({
            "user_id": USER_ID,
            "fetched_at": time.strftime("%Y-%m-%d %H:%M"),
            "items": merged,
        }, ensure_ascii=False, indent=1))
    counts = {}
    for i in merged:
        counts[(i["category"], i["status"])] = counts.get((i["category"], i["status"]), 0) + 1
    for k, v in sorted(counts.items()):
        print(f"{k[0]:6s} {k[1]:8s} {v}")


if __name__ == "__main__":
    main()
