"""Collect cover URLs from Douban grid pages and download them into docs/covers/.

Douban's image CDN rejects foreign referers, so covers must be self-hosted.
Small covers (s_ratio_poster) are fetched for every collected item; medium
ones (m_ratio_poster) only for items the page shows large.
"""
import json
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from bs4 import BeautifulSoup

from fetch import CATEGORIES, USER_ID, get, session

ROOT = Path(__file__).parent
MARKS = ROOT / "data" / "marks.json"
NOTES = ROOT / "data" / "notes.json"
COVER_URLS = ROOT / "data" / "covers.json"
OUT = ROOT / "docs" / "covers"
GRID_PAGE = 15


def large_ids(items, notes):
    collected = sorted((i for i in items if i["status"] == "collect"), key=lambda i: i["date"] or "", reverse=True)
    ids = {i["id"] for i in collected[:40]}
    ids |= {i["id"] for i in collected if i["rating"] and i["rating"] >= 4 and len(i["comment"]) >= 60}
    ids |= set(notes.get("featured", []))
    return ids


def scan_grid(category, known):
    found, start = {}, 0
    while True:
        url = f"https://{category}.douban.com/people/{USER_ID}/collect?start={start}&sort=time&rating=all&filter=all&mode=grid"
        text = get(url, f"https://{category}.douban.com/")
        soup = BeautifulSoup(text, "html.parser")
        total_m = re.search(r"<title>[^<]*?\((\d+)\)", text)
        total = int(total_m.group(1)) if total_m else 0
        rows = soup.select(".item .pic a, li.subject-item .pic a")
        page = {}
        for a in rows:
            m = re.search(r"/subject/(\d+)", a["href"])
            img = a.find("img")
            if m and img and img.get("src"):
                page[m.group(1)] = img["src"]
        found.update(page)
        print(f"  {category} grid start={start}: {len(page)}")
        start += GRID_PAGE
        if not rows or (page and all(k in known for k in page)) or start >= total:
            return found
        time.sleep(1.2 + random.random() * 1.5)


def download(job):
    url, path, referer = job
    if path.exists() and path.stat().st_size > 500:
        return "skip"
    for attempt in range(3):
        try:
            r = session.get(url, headers={"Referer": referer}, timeout=20)
            if r.status_code == 200 and len(r.content) > 500:
                path.write_bytes(r.content)
                return "ok"
        except Exception:
            pass
        time.sleep(2 + attempt * 3)
    return "fail"


def main():
    items = json.loads(MARKS.read_text())["items"]
    notes = json.loads(NOTES.read_text()) if NOTES.exists() else {}
    urls = json.loads(COVER_URLS.read_text()) if COVER_URLS.exists() and "--full" not in sys.argv else {}

    for category in CATEGORIES:
        urls.update(scan_grid(category, set(urls)))
        time.sleep(2)
    COVER_URLS.parent.mkdir(parents=True, exist_ok=True)
    COVER_URLS.write_text(json.dumps(urls, indent=0))

    (OUT / "s").mkdir(parents=True, exist_ok=True)
    (OUT / "m").mkdir(parents=True, exist_ok=True)
    big = large_ids(items, notes)
    jobs = []
    for it in items:
        if it["status"] != "collect" or it["id"] not in urls:
            continue
        src = urls[it["id"]]
        ref = f"https://{it['category']}.douban.com/"
        jobs.append((src, OUT / "s" / f"{it['id']}.jpg", ref))
        if it["id"] in big:
            medium = src.replace("s_ratio_poster", "m_ratio_poster").replace("/subject/s/", "/subject/m/")
            jobs.append((medium, OUT / "m" / f"{it['id']}.jpg", ref))

    with ThreadPoolExecutor(4) as pool:
        results = list(pool.map(download, jobs))
    print({k: results.count(k) for k in set(results)}, f"of {len(jobs)} jobs")


if __name__ == "__main__":
    main()
