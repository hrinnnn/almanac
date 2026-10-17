# 书影音簿

Monotonism 在豆瓣记下的影视、书与唱片，排成一本小册子：年表、时间旅行图、长评选登、卡片柜。

在线阅读：<https://hrinnnn.github.io/almanac/>

## 更新

```bash
python3 fetch.py    # 抓取豆瓣公开标记（增量）
python3 covers.py   # 下载新条目的封面
python3 build.py    # 生成 docs/data.js
```

`data/notes.json` 里是手写的编者按；在 `featured` 中填入豆瓣条目 ID，可以指定「长评选登」展示哪些条目。
