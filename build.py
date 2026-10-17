"""Parse data/marks.json into structured fields and write site/data.js."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "data" / "marks.json"
NOTES = ROOT / "data" / "notes.json"
OUT = ROOT / "docs" / "data.js"
COVERS = ROOT / "docs" / "covers"

COUNTRIES = set("""
美国 英国 法国 德国 西德 东德 意大利 日本 韩国 中国大陆 中国香港 中国台湾 中国 香港 台湾 苏联 俄罗斯
西班牙 伊朗 印度 瑞典 丹麦 挪威 芬兰 波兰 匈牙利 捷克斯洛伐克 捷克 比利时 荷兰 奥地利 瑞士 加拿大
澳大利亚 墨西哥 巴西 阿根廷 泰国 葡萄牙 希腊 土耳其 以色列 爱尔兰 新西兰 古巴 南斯拉夫 罗马尼亚 秘鲁
智利 哥伦比亚 埃及 塞内加尔 马里 菲律宾 越南 新加坡 马来西亚 印度尼西亚 格鲁吉亚 乌克兰 保加利亚 冰岛
卢森堡 南非 黎巴嫩 突尼斯 摩洛哥 阿尔及利亚 爱沙尼亚 立陶宛 拉脱维亚 塞尔维亚 克罗地亚 斯洛文尼亚
斯洛伐克 委内瑞拉 乌拉圭 尼日利亚 布基纳法索 阿富汗 哈萨克斯坦 孟加拉国 斯里兰卡 巴基斯坦 卡塔尔
毛里塔尼亚 柬埔寨 蒙古 亚美尼亚 阿塞拜疆 波黑 马其顿 北马其顿 塞浦路斯 约旦 叙利亚 伊拉克 巴勒斯坦
""".split())

MOVIE_GENRES = set("""
剧情 喜剧 动作 爱情 科幻 动画 悬疑 惊悚 恐怖 犯罪 同性 音乐 歌舞 传记 历史 战争 西部 奇幻 冒险
灾难 武侠 情色 纪录片 短片 家庭 儿童 运动 古装 黑色电影 真人秀 脱口秀 戏曲 鬼怪
""".split())

PUBLISHER_RE = re.compile(
    r"出版|书店|书局|书社|文库|Press|Books|Publish|Classics|Penguin|Vintage|Random|Harper|Norton|Faber",
    re.I,
)
NATION_ALIASES = {
    "美国": "美", "英国": "英", "法国": "法", "德国": "德", "奥地利": "奥", "日本": "日",
    "意大利": "意", "俄罗斯": "俄", "俄国": "俄", "苏联": "苏", "中国": "中", "清": "中",
    "宋": "中", "唐": "中", "明": "中", "汉": "中", "战国": "中", "西班牙": "西", "爱尔兰": "爱",
    "瑞典": "瑞典", "加拿大": "加", "捷克": "捷", "古希腊": "古希腊", "希腊": "希",
}
DURATION_RE = re.compile(r"(\d+)\s*(?:分钟|min\b)")
MEDIA_RE = re.compile(r"CD|Digital|黑胶|Vinyl|磁带|Cassette|DVD|SACD|remaster", re.I)
BOOK_NATION_RE = re.compile(r"^\s*[\[\(（【〔]\s*([^\]\)）】〕]{1,6})\s*[\]\)）】〕]\s*")


def year_of(s):
    m = re.match(r"\s*(\d{4})", s)
    return int(m.group(1)) if m else None


def parse_movie(item):
    parts = [p.strip() for p in item["intro"].split(" / ") if p.strip()]
    main_title = item["title"].split(" / ")[0].strip()
    year = next((year_of(p) for p in parts if year_of(p)), None)
    country_idx = [i for i, p in enumerate(parts) if p in COUNTRIES]
    countries = [parts[i] for i in country_idx]
    genres = [p for p in parts if p in MOVIE_GENRES]
    minutes = next((int(m.group(1)) for p in parts if (m := DURATION_RE.search(p))), None)
    directors = []
    if country_idx:
        for p in parts[country_idx[-1] + 1:]:
            if DURATION_RE.search(p) or p in MOVIE_GENRES or p == main_title:
                break
            if year_of(p) or re.search(r"\d+\s*集|https?:", p) or re.fullmatch(r"[\w\-]+(\.[\w\-]+)+(/\S*)?", p):
                continue
            directors.append(p)
    languages = [p for p in parts if re.fullmatch(r"[\u4e00-\u9fff]{1,6}语", p)]
    return {
        "year": year,
        "countries": countries,
        "genres": genres,
        "creators": directors[:2],
        "minutes": minutes,
        "languages": languages,
    }


def parse_book(item):
    parts = [p.strip() for p in item["intro"].split(" / ") if p.strip()]
    author_raw = parts[0] if parts else ""
    nation = None
    m = BOOK_NATION_RE.match(author_raw)
    if m:
        nation = m.group(1).strip()
        author_raw = author_raw[m.end():]
    author = author_raw.split("，")[0].split(",")[0].strip()
    year = next((year_of(p) for p in parts[1:] if year_of(p)), None)
    publisher = next((p for p in parts[1:] if PUBLISHER_RE.search(p)), None)
    if nation:
        nation = NATION_ALIASES.get(nation, nation)
    elif author and re.fullmatch(r"[\u4e00-\u9fff]{2,4}", author):
        nation = "中"
    return {
        "year": year,
        "countries": [nation] if nation else [],
        "genres": [],
        "creators": [author] if author else [],
        "publisher": publisher,
    }


def parse_music(item):
    parts = [p.strip() for p in item["intro"].split(" / ") if p.strip()]
    artist = parts[0].split(",")[0].strip() if parts else ""
    year = next((year_of(p) for p in parts[1:] if year_of(p)), None)
    kind = next((p for p in parts if p in ("专辑", "单曲", "EP", "选集", "现场", "Live")), None)
    last = parts[-1] if parts else ""
    genre = last if len(parts) >= 4 and len(last) <= 12 and not year_of(last) and not MEDIA_RE.search(last) else None
    return {
        "year": year,
        "countries": [],
        "genres": [genre] if genre else [],
        "creators": [artist] if artist else [],
        "kind": kind,
    }


PARSERS = {"movie": parse_movie, "book": parse_book, "music": parse_music}


def main():
    raw = json.loads(SRC.read_text())
    items = []
    canonical = {}
    wish_counts = {}
    for it in raw["items"]:
        if it["status"] == "wish":
            wish_counts[it["category"]] = wish_counts.get(it["category"], 0) + 1
            continue
        parsed = PARSERS[it["category"]](it)
        parsed["creators"] = [canonical.setdefault(c.lower(), c) for c in parsed["creators"]]
        row = {**it, **parsed, "intro": it["intro"][:160]}
        for size in ("s", "m"):
            if (COVERS / size / f"{it['id']}.jpg").exists():
                row[f"cover_{size}"] = f"covers/{size}/{it['id']}.jpg"
        items.append(row)
    notes = json.loads(NOTES.read_text()) if NOTES.exists() else {}
    payload = {
        "user": {"id": raw["user_id"], "name": "Monotonism", "joined": "2021-07-26", "city": "北京"},
        "fetched_at": raw["fetched_at"],
        "items": items,
        "wish_counts": wish_counts,
        "notes": notes,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("window.DOUBAN = " + json.dumps(payload, ensure_ascii=False) + ";\n")
    print(f"wrote {OUT} ({len(items)} items)")


if __name__ == "__main__":
    main()
