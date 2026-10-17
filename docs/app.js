(() => {
  const D = window.DOUBAN;
  const CATS = ["movie", "book", "music"];
  const GLYPH = { movie: "影", book: "书", music: "音" };
  const VERB = { movie: "看过", book: "读过", music: "听过" };
  const UNIT = { movie: "部影视", book: "本书", music: "张唱片" };
  const COLOR = { movie: "var(--movie)", book: "var(--book)", music: "var(--music)" };
  const CN_DIGIT = "〇一二三四五六七八九";
  const REPO = "https://github.com/hrinnnn/almanac";

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cnYear = (y) => String(y).split("").map((d) => CN_DIGIT[+d]).join("");
  const cnNum = (n) => {
    const u = ["", "十", "百", "千"];
    if (n === 0) return "〇";
    const s = String(n);
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const d = +s[i], p = s.length - 1 - i;
      if (d === 0) { if (!out.endsWith("〇") && i < s.length - 1 && +s.slice(i + 1) > 0) out += "〇"; continue; }
      out += (d === 1 && p === 1 && i === 0 ? "" : CN_DIGIT[d]) + u[p];
    }
    return out;
  };
  const stars = (r) => r ? "★".repeat(r) + `<span class="off">${"★".repeat(5 - r)}</span>` : "";
  const fmt = (n) => n.toLocaleString("en-US");
  const cnDate = (s) => { const [y, m, d] = s.split("-"); return `${y} 年 ${+m} 月 ${+d} 日`; };
  const splitTitle = (t) => { const p = t.split(" / "); return [p[0], p.slice(1).join(" / ")]; };
  const clip = (s, n) => s.length > n ? s.slice(0, n) + "…" : s;
  const quoteTitle = (i) => i.category === "music" ? esc(clip(splitTitle(i.title)[0], 30)) : `《${esc(clip(splitTitle(i.title)[0], 24))}》`;
  const count = (arr, key) => {
    const m = new Map();
    for (const x of arr) for (const k of [].concat(key(x) ?? [])) if (k) m.set(k, (m.get(k) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cover = (i, size = "s", style = "") => {
    const src = size === "m" ? (i.cover_m || i.cover_s) : (i.cover_s || i.cover_m);
    return src
      ? `<img class="cover" src="${src}" alt="${esc(splitTitle(i.title)[0])}" loading="lazy" style="${style}">`
      : `<div class="cover none" style="background:${COLOR[i.category]};${style}">${GLYPH[i.category]}</div>`;
  };

  const all = D.items;
  const col = all.filter((i) => i.status === "collect");
  const byCat = Object.fromEntries(CATS.map((c) => [c, col.filter((i) => i.category === c)]));
  const doing = all.filter((i) => i.status === "do");
  const wishN = D.wish_counts || {};
  const [fy, fm] = D.fetched_at.slice(0, 7).split("-").map(Number);
  const recentFirst = [...col].sort((a, b) => b.date.localeCompare(a.date));

  /* ---------- tooltip ---------- */

  const slip = $("#slip");
  function showSlip(e, html) {
    slip.innerHTML = html;
    slip.classList.add("on");
    const r = slip.getBoundingClientRect();
    let left = e.clientX + 16, top = e.clientY + 14;
    if (left + r.width > innerWidth - 10) left = e.clientX - r.width - 16;
    if (top + r.height > innerHeight - 10) top = e.clientY - r.height - 14;
    slip.style.left = Math.max(6, left) + "px";
    slip.style.top = Math.max(6, top) + "px";
  }
  const hideSlip = () => slip.classList.remove("on");
  const itemSlip = (i, extra = "") => `
    ${i.cover_s ? `<img src="${i.cover_s}" alt="">` : ""}
    <div class="d">${GLYPH[i.category]} · ${i.date.replaceAll("-", ".")}${i.year ? ` · ${i.year}` : ""}</div>
    <div class="tt">${esc(splitTitle(i.title)[0])}</div>
    <div style="color:var(--ink-soft);font-size:12.5px">${esc(i.creators.join(" / "))}</div>
    ${i.rating ? `<div style="color:var(--red);font-size:11px;letter-spacing:.1em">${"★".repeat(i.rating)}</div>` : ""}
    ${i.comment ? `<div style="clear:both;font-family:var(--kai);font-size:14px;margin-top:6px;line-height:1.6">${esc(i.comment.length > 90 ? i.comment.slice(0, 90) + "……" : i.comment)}</div>` : ""}${extra}`;

  /* ---------- masthead ---------- */

  $("#issue-date").textContent = `${cnYear(fy)}年${cnNum(fm)}月 · ${D.user.city}`;
  const firstYear = Math.min(...col.map((i) => +i.date.slice(0, 4)));
  $("#vol").textContent = `第一卷 · ${cnYear(firstYear)}—${cnYear(fy)}`;
  $("#dek").innerHTML = `
    <span>收录 ${D.user.joined.slice(0, 4)} 年 ${+D.user.joined.slice(5, 7)} 月以来于豆瓣所记：
      影视 <b>${byCat.movie.length}</b> 部，书 <b>${byCat.book.length}</b> 册，唱片 <b>${byCat.music.length}</b> 张</span>
    <span><a href="https://www.douban.com/people/${D.user.id}/" target="_blank">豆瓣 · ${esc(D.user.name)}</a></span>`;

  /* ---------- epigraph ---------- */

  const quotable = col.filter((i) => i.comment && i.comment.length >= 10 && i.comment.length <= 64 && !i.comment.includes("\n") && (i.rating || 0) >= 4);
  let epiIdx = -1;
  function nextEpigraph() {
    let k;
    do { k = Math.floor(Math.random() * quotable.length); } while (quotable.length > 1 && k === epiIdx);
    epiIdx = k;
    const it = quotable[k];
    $("#epi-text").textContent = it.comment;
    $("#epi-src").innerHTML = `—— 题<a href="${it.url}" target="_blank">${quoteTitle(it)}</a>，${it.date.replaceAll("-", ".")} &nbsp;<span class="stars">${"★".repeat(it.rating)}</span>`;
  }
  $("#epi-next").onclick = nextEpigraph;
  nextEpigraph();

  /* ---------- table of contents ---------- */

  $("#toc").innerHTML = `<div class="toc-head">目 录</div><ol>${[...document.querySelectorAll("section[data-toc]")].map((s) => {
    const [t, d] = s.dataset.toc.split("|");
    return `<li><a href="#${s.id}"><span class="n">${s.querySelector(".num").textContent}</span><span class="t">${t}</span><span class="dots"></span><span class="d">${d}</span></a></li>`;
  }).join("")}</ol>`;

  /* ---------- ledger ---------- */

  const minutes = byCat.movie.reduce((s, i) => s + (i.minutes || 0), 0);
  const oldest = (arr) => arr.filter((i) => i.year).sort((a, b) => a.year - b.year)[0];
  const favDecade = (arr) => { const c = count(arr, (i) => i.year ? Math.floor(i.year / 10) * 10 : null)[0]; return c ? `${c[0]}s` : "—"; };
  const pct5 = (arr) => Math.round(100 * arr.filter((i) => i.rating === 5).length / arr.length);
  const ledgerRows = {
    movie: (a) => [
      ["五星", `${a.filter((i) => i.rating === 5).length}（${pct5(a)}%）`],
      ["写下短评", a.filter((i) => i.comment).length],
      ["总片长", `${fmt(minutes)} 分钟`],
      ["最老的一部", `${oldest(a).year}《${splitTitle(oldest(a).title)[0]}》`],
      ["想看", `${wishN.movie || 0} 部`],
    ],
    book: (a) => [
      ["五星", `${a.filter((i) => i.rating === 5).length}（${pct5(a)}%）`],
      ["写下短评", a.filter((i) => i.comment).length],
      ["中文作者", `${a.filter((i) => i.countries[0] === "中").length} 册`],
      ["读得最多", count(a, (i) => i.creators[0])[0][0]],
      ["想读", `${wishN.book || 0} 本`],
    ],
    music: (a) => [
      ["五星", `${a.filter((i) => i.rating === 5).length}（${pct5(a)}%）`],
      ["写下短评", a.filter((i) => i.comment).length],
      ["最偏爱的年代", favDecade(a)],
      ["最常听的流派", count(a, (i) => i.genres)[0][0]],
      ["想听", `${wishN.music || 0} 张`],
    ],
  };
  const leaders = (rows) => `<ul class="leaders">${rows.map(([k, v]) => `<li><span class="k">${esc(k)}</span><span class="dots"></span><span class="v" title="${esc(v)}">${esc(v)}</span></li>`).join("")}</ul>`;
  $("#ledger").innerHTML = CATS.map((c) => `
    <div class="ledger-col">
      <div class="ledger-head cat-${c}">
        <span class="glyph">${GLYPH[c]}</span>
        <span class="big-num" style="color:var(--ink)">${byCat[c].length}</span>
        <span class="unit">${UNIT[c]}</span>
      </div>
      ${leaders(ledgerRows[c](byCat[c]))}
    </div>`).join("");

  const dayCounts = count(col, (i) => i.date);
  const weekdays = count(col, (i) => "日一二三四五六"[new Date(i.date + "T00:00").getDay()]);
  const yearCounts = count(col, (i) => i.date.slice(0, 4));
  $("#ledger-notes").innerHTML = [
    `最漫长的一天是 ${cnDate(dayCounts[0][0])}，一口气记下 ${dayCounts[0][1]} 条`,
    `最常在星期${weekdays[0][0]}标记`,
    `最丰盛的一年是 ${yearCounts[0][0]}，共 ${yearCounts[0][1]} 条`,
    `≈ ${Math.round(minutes / 60 / 24)} 个昼夜坐在暗处`,
  ].map((s) => `<span>${s}</span>`).join("");

  /* ---------- recent ---------- */

  const recent = recentFirst.slice(0, 28);
  const last30 = col.filter((i) => (new Date(D.fetched_at.slice(0, 10)) - new Date(i.date)) / 864e5 <= 30);
  const c30 = Object.fromEntries(CATS.map((c) => [c, last30.filter((i) => i.category === c).length]));
  $("#recent-lede").textContent = `最近一次标记在 ${cnDate(recent[0].date)}。过去三十天里记下 ${last30.length} 条：影 ${c30.movie}、书 ${c30.book}、音 ${c30.music}。橱窗里按时间从近到远陈列，悬停可读短评。`;
  $("#recent").innerHTML = recent.map((i, k) => `
    <a class="item" href="${i.url}" target="_blank" data-k="${k}">
      <div class="stand">${cover(i, "m")}</div>
      <span class="tag">${i.date.slice(5).replace("-", ".")}<span class="r">${i.rating ? "★".repeat(i.rating) : "&nbsp;"}</span></span>
    </a>`).join("");
  $("#recent").addEventListener("mousemove", (e) => {
    const a = e.target.closest(".item");
    if (!a) return hideSlip();
    showSlip(e, itemSlip(recent[+a.dataset.k]));
  });
  $("#recent").addEventListener("mouseleave", hideSlip);
  const doingBy = (c) => doing.filter((i) => i.category === c);
  $("#doing").innerHTML = [["movie", "在 看"], ["book", "在 读"], ["music", "在 听"]].map(([c, label]) => {
    const list = doingBy(c);
    return `<div><h4>${label} · ${list.length}</h4><p>${list.slice(0, 12).map((i) => `<a href="${i.url}" target="_blank">${quoteTitle(i)}</a>`).join(c === "music" ? `<span style="color:var(--ink-faint)"> ／ </span>` : "") || "—"}${list.length > 12 ? ` ……等 ${list.length} 种` : ""}</p></div>`;
  }).join("");

  /* ---------- chronicle ---------- */

  const byDate = new Map();
  for (const i of col) { if (!byDate.has(i.date)) byDate.set(i.date, []); byDate.get(i.date).push(i); }
  const years = [...new Set(col.map((i) => +i.date.slice(0, 4)))].sort();
  const W = 732, H = 64, SEG = 3, CAP = 20;
  let chronHtml = `<div class="chron-months"><span></span><div class="m">${"一二三四五六七八九十".split("").concat(["十一", "十二"]).map((m) => `<span>${m}月</span>`).join("")}</div><span></span></div>`;
  for (const y of years) {
    let marks = "", hits = "", total = 0;
    for (let d = 0; d < 366; d++) {
      const dt = new Date(y, 0, 1 + d);
      if (dt.getFullYear() !== y) break;
      const key = `${y}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const list = byDate.get(key);
      if (!list) continue;
      total += list.length;
      const x = d * (W / 366) + 0.5;
      [...list].sort((a, b) => CATS.indexOf(a.category) - CATS.indexOf(b.category)).slice(0, CAP).forEach((it, k) => {
        marks += `<rect x="${x.toFixed(1)}" y="${H - (k + 1) * SEG}" width="1.9" height="${SEG - 0.7}" fill="${COLOR[it.category]}"/>`;
      });
      if (list.length > CAP) marks += `<circle cx="${(x + 0.9).toFixed(1)}" cy="${H - CAP * SEG - 4}" r="2" fill="var(--red)"/>`;
      hits += `<rect class="hit" data-d="${key}" x="${(x - 1.5).toFixed(1)}" y="0" width="4.6" height="${H}"/>`;
    }
    chronHtml += `<div class="chron-row" data-y="${y}"><span class="yr">${y}</span>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="var(--rule)" stroke-width=".6"/>
        ${marks}${hits}
      </svg><span class="tot">${total} 条</span></div>`;
  }
  $("#chron").innerHTML = chronHtml;
  $("#chron").addEventListener("mousemove", (e) => {
    const t = e.target.closest(".hit");
    if (!t) return hideSlip();
    const list = byDate.get(t.dataset.d);
    showSlip(e, `<div class="d">${t.dataset.d.replaceAll("-", " · ")} &nbsp;共 ${list.length} 条</div>` +
      list.slice(0, 7).map((i) => `<div class="row"><i class="cat-${i.category}">${GLYPH[i.category]}</i><span>${esc(splitTitle(i.title)[0])}${i.rating ? ` <span style="color:var(--red);font-size:11px">${"★".repeat(i.rating)}</span>` : ""}</span></div>`).join("") +
      (list.length > 7 ? `<div class="more">…… 另有 ${list.length - 7} 条</div>` : ""));
  });
  $("#chron").addEventListener("mouseleave", hideSlip);
  $("#chron").addEventListener("click", (e) => {
    const row = e.target.closest(".chron-row");
    if (row) renderYear(+row.dataset.y, true);
  });

  function renderYear(y, scroll) {
    document.querySelectorAll(".chron-row").forEach((r) => r.classList.toggle("on", +r.dataset.y === y));
    const arr = col.filter((i) => i.date.startsWith(String(y)));
    const n = Object.fromEntries(CATS.map((c) => [c, arr.filter((i) => i.category === c).length]));
    const picks = arr.filter((i) => i.rating === 5).sort((a, b) => b.comment.length - a.comment.length || b.date.localeCompare(a.date)).slice(0, 12);
    const names = count(arr, (i) => i.creators).filter(([, k]) => k >= 2).slice(0, 8);
    const months = count(arr, (i) => i.date.slice(5, 7));
    const days = count(arr, (i) => i.date);
    $("#year-panel").innerHTML = `
      <div class="yp-head"><span class="y">${y}</span><span class="t">年度之选</span>
        <span class="s">影 ${n.movie} · 书 ${n.book} · 音 ${n.music} ｜ 五星 ${arr.filter((i) => i.rating === 5).length} ｜ 短评 ${arr.filter((i) => i.comment).length}</span></div>
      <div class="yp-picks">${picks.map((i, k) => `
        <a class="yp-pick" href="${i.url}" target="_blank" data-id="${i.id}">
          ${cover(i, "m")}
          <div class="cap"><span class="rank">${String(k + 1).padStart(2, "0")}</span> ${esc(splitTitle(i.title)[0])}</div>
          <div class="by">${esc(i.creators[0] || "")}</div>
        </a>`).join("") || `<div class="caption">这一年没有给出五星。</div>`}</div>
      <div class="yp-foot">
        ${names.length ? `<div><span class="lbl">常见的名字</span>${names.map(([k, c]) => `<b>${esc(k)}</b> ${c}`).join("　")}</div>` : ""}
        <div><span class="lbl">最忙的月份</span>${+months[0][0]} 月，${months[0][1]} 条　<span class="lbl" style="margin-left:14px">最忙的一天</span>${cnDate(days[0][0]).slice(7)}，${days[0][1]} 条</div>
      </div>`;
    const map = new Map(picks.map((i) => [i.id, i]));
    $("#year-panel").onmousemove = (e) => { const a = e.target.closest(".yp-pick"); a ? showSlip(e, itemSlip(map.get(a.dataset.id))) : hideSlip(); };
    $("#year-panel").onmouseleave = hideSlip;
    if (scroll) $("#year-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  renderYear(years.includes(fy) && col.filter((i) => i.date.startsWith(String(fy))).length >= 30 ? fy : years[years.length - 2] || years[0]);

  /* ---------- time travel ---------- */

  const tItems = col.filter((i) => i.year && i.category !== "book");
  const t0 = new Date(Math.min(...tItems.map((i) => +new Date(i.date)))), t1 = new Date(D.fetched_at.slice(0, 10));
  const y0 = Math.floor(Math.min(...tItems.map((i) => i.year)) / 10) * 10, y1 = fy + 1;
  const TW = 900, TH = 400, PL = 48, PR = 12, PT = 14, PB = 34;
  const sx = (d) => PL + ((+new Date(d) - +t0) / (+t1 - +t0)) * (TW - PL - PR);
  const sy = (y) => PT + (1 - (y - y0) / (y1 - y0)) * (TH - PT - PB);
  let tsvg = "";
  for (let y = y0; y <= y1; y += 10) {
    tsvg += `<line x1="${PL}" x2="${TW - PR}" y1="${sy(y)}" y2="${sy(y)}" stroke="var(--rule)" stroke-opacity="${y % 50 === 0 ? .35 : .12}" stroke-width=".7"/>`;
    if (y % 20 === 0) tsvg += `<text x="${PL - 8}" y="${sy(y) + 4}" font-size="12" text-anchor="end">${y}</text>`;
  }
  for (let y = t0.getFullYear() + 1; y <= t1.getFullYear(); y++) {
    const x = sx(`${y}-01-01`);
    tsvg += `<line x1="${x}" x2="${x}" y1="${PT}" y2="${TH - PB}" stroke="var(--rule)" stroke-opacity=".15" stroke-dasharray="2 3"/>`;
    tsvg += `<text x="${x}" y="${TH - PB + 20}" font-size="12" text-anchor="middle">${y}</text>`;
  }
  tsvg += `<line x1="${sx(t0)}" y1="${sy(t0.getFullYear() + t0.getMonth() / 12)}" x2="${sx(t1)}" y2="${sy(t1.getFullYear() + t1.getMonth() / 12)}" stroke="var(--red)" stroke-width="1" stroke-dasharray="5 4" opacity=".7"/>`;
  tsvg += `<text x="${sx(t1) - 4}" y="${sy(t1.getFullYear()) - 8}" font-size="11.5" text-anchor="end" style="fill:var(--red);font-style:italic">当年新作</text>`;
  tsvg += `<line x1="${PL}" x2="${TW - PR}" y1="${TH - PB}" y2="${TH - PB}" stroke="var(--rule)" stroke-width="1"/>`;
  tItems.forEach((i, k) => {
    const jitter = ((k * 37) % 7 - 3) * 0.6;
    tsvg += `<circle class="dot" data-k="${k}" cx="${(sx(i.date) + jitter).toFixed(1)}" cy="${sy(i.year + 0.5).toFixed(1)}" r="3.2" fill="${COLOR[i.category]}" fill-opacity=".62" stroke="var(--paper)" stroke-width=".6"/>`;
  });
  $("#travel").innerHTML = `<svg viewBox="0 0 ${TW} ${TH}">${tsvg}</svg>`;
  $("#travel").addEventListener("mousemove", (e) => {
    const d = e.target.closest(".dot");
    if (!d) return hideSlip();
    const i = tItems[+d.dataset.k];
    showSlip(e, itemSlip(i, `<div class="more" style="clear:both">相隔 ${+i.date.slice(0, 4) - i.year} 年</div>`));
  });
  $("#travel").addEventListener("mouseleave", hideSlip);
  const gap = (i) => +i.date.slice(0, 4) - i.year;
  const avgGap = (c) => Math.round(tItems.filter((i) => i.category === c).reduce((s, i) => s + gap(i), 0) / tItems.filter((i) => i.category === c).length);
  const farthest = [...tItems].sort((a, b) => gap(b) - gap(a))[0];
  $("#travel-lede").textContent = "横轴是标记的日子，纵轴是作品诞生的年份。红色虚线是“当年新作”，点落得越低，那一次走得越远。";
  $("#travel-cap").innerHTML = `平均而言，每看一部电影要回到 <b>${avgGap("movie")}</b> 年前，每听一张唱片要回到 <b>${avgGap("music")}</b> 年前。走得最远的一次：${farthest.date.slice(0, 4)} 年${VERB[farthest.category]} ${farthest.year} 年的${quoteTitle(farthest)}，相隔 ${gap(farthest)} 年。书不在图上，因为豆瓣记的是版本的出版年份。`;

  /* ---------- long reviews ---------- */

  const notes = D.notes || {};
  let featured = (notes.featured || []).map((id) => col.find((i) => i.id === id)).filter(Boolean);
  if (!featured.length) {
    const caps = { movie: 3, book: 3, music: 1 };
    const pool = col.filter((i) => (i.rating || 0) >= 4 && i.comment.length >= 150).sort((a, b) => b.comment.length - a.comment.length);
    for (const i of pool) if (caps[i.category]-- > 0) featured.push(i);
    featured.sort((a, b) => b.date.localeCompare(a.date));
  }
  $("#reviews").innerHTML = featured.map((i) => {
    const [main, orig] = splitTitle(i.title);
    const paras = i.comment.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    return `<article class="review">
      <div class="rv-pic"><a href="${i.url}" target="_blank">${cover(i, "m")}</a>
        <div class="cap">${VERB[i.category]}于 ${i.date.replaceAll("-", ".")}<br>${esc(i.creators.join(" / "))}${i.year ? ` · ${i.year}` : ""}</div></div>
      <div class="rv-body">
        <div class="kicker">${GLYPH[i.category]} · ${{ movie: "影评", book: "书评", music: "乐评" }[i.category]}</div>
        <h3><a href="${i.url}" target="_blank">${esc(main)}</a></h3>
        ${orig ? `<div class="orig">${esc(orig)}</div>` : ""}
        <div class="line"><span class="stars">${"★".repeat(i.rating || 0)}</span>　${i.comment.length} 字</div>
        <div class="text">${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      </div>
    </article>`;
  }).join("");

  /* ---------- quotes ---------- */

  const shortOnes = col.filter((i) => i.comment && i.comment.trim().length >= 4 && i.comment.trim().length <= 36 && !i.comment.trim().includes("\n"));
  function renderQuotes() {
    $("#quotes").innerHTML = shuffle(shortOnes).slice(0, 18).map((i) => {
      const t = i.comment.trim();
      return `<div class="quote${t.length <= 10 ? " big" : ""}"><q>${esc(t)}</q>
        <div class="from">—— <a href="${i.url}" target="_blank">${quoteTitle(i)}</a> ${i.rating ? `<span class="stars">${"★".repeat(i.rating)}</span>` : ""}</div></div>`;
    }).join("");
  }
  $("#quotes-next").onclick = renderQuotes;
  renderQuotes();

  /* ---------- index ---------- */

  const idxTitle = { movie: ["导演", "Directors"], book: ["作者", "Authors"], music: ["音乐人", "Artists"] };
  const tag = ([k, n]) => `<span style="white-space:nowrap"><b>${esc(k)}</b> ${n}</span>`;
  $("#index").innerHTML = CATS.map((c) => {
    const arr = byCat[c];
    const top = count(arr, (i) => i.creators).filter(([, n]) => n >= 2).slice(0, 16);
    const fives = new Map(count(arr.filter((i) => i.rating === 5), (i) => i.creators));
    const rows = top.map(([k, n]) => `<li><span class="k">${esc(k)}<span class="five">${"●".repeat(Math.min(fives.get(k) || 0, 8))}</span></span><span class="dots"></span><span class="v">${n}</span></li>`).join("");
    let tags;
    if (c === "music") {
      tags = `<span class="lbl">流派</span>` + count(arr, (i) => i.genres).slice(0, 8).map(tag).join("　");
    } else {
      tags = `<span class="lbl">${c === "movie" ? "国别" : "作者国籍"}</span>` + count(arr, (i) => i.countries).slice(0, 10).map(tag).join("　");
      if (c === "movie") tags += `<span class="lbl" style="margin-top:8px">类型</span>` + count(arr, (i) => i.genres).slice(0, 8).map(tag).join("　");
    }
    return `<div class="index-col"><h3><span class="cat-${c}">${idxTitle[c][0]}</span><small><i>${idxTitle[c][1]}</i></small></h3><ul class="leaders">${rows}</ul><div class="tags">${tags}</div></div>`;
  }).join("");

  /* ---------- shelf ---------- */

  const SHELF_CATS = ["movie", "music"];
  const shelfItems = col.filter((i) => SHELF_CATS.includes(i.category) && i.year);
  const decs = [];
  for (let d = Math.min(...shelfItems.map((i) => Math.floor(i.year / 10) * 10)); d <= Math.floor(fy / 10) * 10; d += 10) decs.push(d);
  const decCount = Object.fromEntries(SHELF_CATS.map((c) => [c, Object.fromEntries(count(byCat[c], (i) => i.year ? Math.floor(i.year / 10) * 10 : null))]));
  const maxDec = Math.max(...SHELF_CATS.flatMap((c) => Object.values(decCount[c])));
  const SW = 20, SG = 3, GG = 16, SH = 200, TOP = 26;
  const groupW = SHELF_CATS.length * SW + (SHELF_CATS.length - 1) * SG;
  const svgW = decs.length * groupW + (decs.length - 1) * GG;
  let shelf = "";
  decs.forEach((d, gi) => {
    const gx = gi * (groupW + GG);
    SHELF_CATS.forEach((c, ci) => {
      const n = decCount[c][d] || 0;
      if (!n) return;
      const h = Math.max(8, (n / maxDec) * SH);
      const x = gx + ci * (SW + SG), y = TOP + SH - h;
      const bands = h > 30
        ? `<rect x="${x}" y="${y + 6}" width="${SW}" height="1.4" fill="var(--paper)" opacity=".5"/>
           <rect x="${x}" y="${y + 10}" width="${SW}" height=".7" fill="var(--paper)" opacity=".5"/>
           <rect x="${x}" y="${TOP + SH - 10}" width="${SW}" height=".9" fill="var(--paper)" opacity=".45"/>`
        : "";
      shelf += `<g class="spine"><title>${d} 年代 · ${GLYPH[c]} ${n}</title>
        <rect class="body" x="${x}" y="${y}" width="${SW}" height="${h}" fill="${COLOR[c]}" opacity=".9"/>${bands}
        <text x="${x + SW / 2}" y="${y - 6}" font-size="12" text-anchor="middle" style="font-variant-numeric:oldstyle-nums">${n}</text>
      </g>`;
    });
    shelf += `<text x="${gx + groupW / 2}" y="${TOP + SH + 24}" font-size="15" text-anchor="middle" style="fill:var(--ink);font-variant-numeric:oldstyle-nums">${String(d).slice(2)}s</text>`;
  });
  shelf += `<rect class="plank" x="-10" y="${TOP + SH}" width="${svgW + 20}" height="5"/>`;
  $("#shelf").innerHTML = `<svg viewBox="-12 0 ${svgW + 24} ${TOP + SH + 34}">${shelf}</svg>`;
  const pre1970 = byCat.movie.filter((i) => i.year && i.year < 1970).length;
  $("#shelf-cap").textContent = `影（蓝）与音（绿）按作品问世的年代上架。电影里有 ${pre1970} 部生于 1970 年以前。`;

  const ratingRows = [5, 4, 3, 2, 1, null];
  const maxR = Math.max(...CATS.flatMap((c) => ratingRows.map((r) => byCat[c].filter((i) => i.rating === r).length)));
  $("#temper").innerHTML = `<table><thead><tr><th colspan="3">打分的脾气</th></tr></thead><tbody>${ratingRows.map((r) => {
    const ns = CATS.map((c) => byCat[c].filter((i) => i.rating === r).length);
    return `<tr><td class="s ${r ? "" : "none"}">${r ? "★".repeat(r) : "不 评"}</td>
      <td class="bars">${CATS.map((c, k) => `<div class="bar" style="width:${(ns[k] / maxR) * 100}%;background:${COLOR[c]}" title="${GLYPH[c]} ${ns[k]}"></div>`).join("")}</td>
      <td class="n">${ns.join(" · ")}</td></tr>`;
  }).join("")}</tbody></table>
  <div class="caption" style="margin-top:14px">三条细线自上而下依次为影、书、音。五星是常态，一星大多留给了教科书。</div>`;

  /* ---------- essay ---------- */

  if (notes.portrait) {
    $("#essay").innerHTML = `<h3>${esc(notes.portrait_title)}</h3>
      <div class="byline">An editor's note, ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][fm - 1]} ${fy}</div>
      <div class="body">${notes.portrait.map((p, k) => `<p>${k ? "" : `<span class="an">按</span>`}${esc(p)}</p>`).join("")}</div>
      <div class="sign">编者 识于${cnYear(fy)}年${cnNum(fm)}月</div>`;
  }

  /* ---------- card catalog ---------- */

  const state = { cat: "all", year: "", rating: "", comment: false, q: "", shown: 36 };
  const yearSel = $("#f-year");
  years.slice().reverse().forEach((y) => yearSel.insertAdjacentHTML("beforeend", `<option value="${y}">${y} 年</option>`));
  const serial = new Map();
  [...col].sort((a, b) => a.date.localeCompare(b.date)).forEach((i, k) => serial.set(i, k + 1));

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return col.filter((i) =>
      (state.cat === "all" || i.category === state.cat) &&
      (!state.year || i.date.startsWith(state.year)) &&
      (!state.rating || (state.rating === "none" ? !i.rating : state.rating === "low" ? i.rating && i.rating <= 2 : i.rating === +state.rating)) &&
      (!state.comment || i.comment) &&
      (!q || [i.title, i.intro, i.comment, i.creators.join(" ")].join(" ").toLowerCase().includes(q))
    );
  }
  function card(i) {
    const [main, orig] = splitTitle(i.title);
    const second = i.category === "movie" ? i.countries.slice(0, 2).join(" ") : i.category === "book" ? (i.publisher || "") : (i.genres[0] || "");
    return `<article class="card">
      <div class="head">
        <div class="call"><span><span class="c cat-${i.category}">${GLYPH[i.category]}</span> ${i.year || "····"}</span><span>No.${String(serial.get(i)).padStart(4, "0")}</span></div>
        <h4><a href="${i.url}" target="_blank" title="${esc(i.title)}">${esc(main)}</a></h4>
      </div>
      <div class="body">
        <a class="pic" href="${i.url}" target="_blank">${cover(i, "s")}</a>
        <div class="info">
          <div class="orig">${orig ? esc(orig) : "&nbsp;"}</div>
          <div class="meta" title="${esc(i.creators.join(" / "))}">${esc(i.creators.join(" / ")) || "&nbsp;"}</div>
          <div class="meta">${esc(second) || "&nbsp;"}</div>
        </div>
      </div>
      <div class="meta"><span class="stars">${stars(i.rating) || `<span style="color:var(--ink-faint);font-family:var(--song);letter-spacing:.2em;font-size:12px">${VERB[i.category]} · 未评</span>`}</span></div>
      ${i.comment ? `<div class="comment">${esc(i.comment.trim())}</div>` : ""}
      <div class="stamp">${i.date.replaceAll("-", ".")}</div>
    </article>`;
  }
  function renderCards() {
    const list = filtered();
    $("#f-count").textContent = `共 ${list.length} 张卡片`;
    $("#cards").innerHTML = list.length ? list.slice(0, state.shown).map(card).join("") : `<div class="empty">这一屉是空的。</div>`;
    $("#more").style.display = list.length > state.shown ? "" : "none";
  }
  $("#cat-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("#cat-tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    state.cat = b.dataset.cat; state.shown = 36; renderCards();
  });
  yearSel.onchange = (e) => { state.year = e.target.value; state.shown = 36; renderCards(); };
  $("#f-rating").onchange = (e) => { state.rating = e.target.value; state.shown = 36; renderCards(); };
  $("#f-comment").onchange = (e) => { state.comment = e.target.checked; state.shown = 36; renderCards(); };
  let qTimer;
  $("#f-q").oninput = (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; state.shown = 36; renderCards(); }, 160); };
  $("#more").onclick = () => { state.shown += 36; renderCards(); };
  $("#cards").addEventListener("click", (e) => { const c = e.target.closest(".comment"); if (c) c.classList.toggle("open"); });
  renderCards();

  /* ---------- lots ---------- */

  const YI = ["独自", "深夜", "雨天", "关掉手机", "泡一壶茶", "坐在窗边", "周日下午", "写一句短评", "慢一点", "打开台灯", "散步之后", "不看简介"];
  const JI = ["快进", "倍速", "边吃边刷", "剧透", "开弹幕", "中途放弃", "急着打分", "看完就忘", "一心二用", "赶 DDL 时"];
  const fiveStar = col.filter((i) => i.rating === 5);
  let lotCat = "all";
  $("#lot-count").textContent = `筒中 ${fiveStar.length} 签`;
  $("#lot-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("#lot-tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    lotCat = b.dataset.cat;
  });
  $("#shake").onclick = () => {
    const pool = fiveStar.filter((i) => lotCat === "all" || i.category === lotCat);
    const it = pool[Math.floor(Math.random() * pool.length)];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const [main] = splitTitle(it.title);
    const lot = $("#lot");
    lot.outerHTML = `<div class="lot-wrap" id="lot">
      <div class="lot shaking">
        <div class="no">第${cnNum(fiveStar.indexOf(it) + 1)}签 · ${GLYPH[it.category]}</div>
        <div class="ttl"><a href="${it.url}" target="_blank">${esc(main)}</a></div>
        <div class="sub">${esc([it.creators[0], it.year].filter(Boolean).join("　"))}</div>
        <div class="yiji"><b>宜</b> ${pick(YI)}<br><b>忌</b> ${pick(JI)}</div>
      </div>
      <div><a href="${it.url}" target="_blank">${cover(it, "m")}</a>
        ${it.comment ? `<div style="font-family:var(--kai);font-size:14.5px;line-height:1.7;max-width:200px;margin-top:14px;color:#22283a">「${esc(it.comment.length > 70 ? it.comment.slice(0, 70) + "……" : it.comment)}」</div>` : ""}</div>
    </div>`;
  };

  /* ---------- on this day ---------- */

  const today = new Date();
  const md = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let otd = [], offset = 0;
  for (offset = 0; offset <= 7 && !otd.length; offset++) {
    const days = new Set([0, offset, -offset].map((o) => md(new Date(today.getFullYear(), today.getMonth(), today.getDate() + o))));
    otd = col.filter((i) => days.has(i.date.slice(5)) && +i.date.slice(0, 4) < today.getFullYear());
  }
  $("#otd-date").textContent = `${today.getMonth() + 1} 月 ${today.getDate()} 日${offset > 1 ? `前后 ${offset - 1} 天` : ""}`;
  $("#otd").innerHTML = otd.length
    ? otd.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map((i) => `<li><i class="cat-${i.category}">${GLYPH[i.category]}</i><a href="${i.url}" target="_blank" title="${esc(i.title)}">${esc(splitTitle(i.title)[0])}</a><span class="yr">${i.date.slice(0, 4)} ${i.rating ? `<span style="color:var(--red)">${"★".repeat(i.rating)}</span>` : ""}</span></li>`).join("")
    : `<li class="otd-empty">往年这几天，什么也没有记下。</li>`;

  /* ---------- colophon ---------- */

  $("#colophon").innerHTML = `<div class="t">版 权 页</div>
    <div class="grid">
      <span>书名</span><span>书影音簿 · 第一卷</span>
      <span>辑录</span><span><a href="https://www.douban.com/people/${D.user.id}/" target="_blank">${esc(D.user.name)}</a></span>
      <span>资料</span><span>豆瓣公开标记，更新于 ${esc(D.fetched_at)}</span>
      <span>字体</span><span>宋体、楷体、Baskerville、American Typewriter</span>
      <span>源码</span><span><a href="${REPO}" target="_blank">github.com/hrinnnn/almanac</a></span>
      <span>印数</span><span>一册，无限次翻阅</span>
    </div>`;
})();
