# -*- coding: utf-8 -*-
"""Build the static site: index.html, groups/NN.html, distribution files."""
import html, json, os, re, sys, csv
sys.path.insert(0, os.path.dirname(__file__))
from data import GROUPS, SAY

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, "groups"), exist_ok=True)
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">'
BRAND = "Чемоданчик учителя английского"
e = html.escape
alts = lambda f: [x.strip().lower() for x in f.split("/")]
problems = []

def verb_obj(t):
    v1, v2, v3, i1, i2, i3, ru, s2, t2, s3, t3 = t
    for s, f, n in ((s2, v2, "V2"), (s3, v3, "V3")):
        m = re.findall(r"\*([^*]+)\*", s)
        if len(m) != 1: problems.append(f"{v1}: {n} sentence needs one *target*: {s}")
        elif m[0].lower() not in alts(f): problems.append(f"{v1}: {n} target '{m[0]}' not in '{f}'")
    o = dict(v=[v1, v2, v3], ipa=[i1, i2, i3], ru=ru, s2=s2, t2=t2, s3=s3, t3=t3)
    if v1 in SAY: o["say"] = list(SAY[v1])
    return o

def expand_story(g):
    by = {t[0]: t for t in g["verbs"]}
    def rep(m):
        base, ans = m.group(1), m.group(2)
        t = by.get(base)
        if not t: problems.append(f"group {g['id']}: story base '{base}' not in group"); return m.group(0)
        forms = [t[0], t[1], t[2]]
        hit = [f for f in forms if ans.lower() in alts(f)]
        if not hit: problems.append(f"group {g['id']}: story answer '{ans}' not a form of {base}"); return m.group(0)
        full = hit[0] if base != "be" else ans
        return f"[[{base}|{full}]]"
    return re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", rep, g["story"])

def page(title, body, depth=0, extra_head=""):
    up = "../" * depth
    return f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>{FONTS}<link rel="stylesheet" href="{up}assets/style.css">{extra_head}</head>
<body><div class="wrap">{body}
<div class="foot">© {BRAND} · Неправильные глаголы по группам чередований · B1–B2</div></div></body></html>"""

# ---- group pages
for n, g in enumerate(GROUPS):
    prev = GROUPS[n - 1] if n else None
    nxt = GROUPS[n + 1] if n + 1 < len(GROUPS) else None
    data = dict(id=g["id"], pattern=g["pattern"], title=g["title"], verbs=[verb_obj(t) for t in g["verbs"]],
                story_title=g["story_title"], story=expand_story(g))
    nav = '<nav class="top-nav"><a href="../index.html">← Все группы</a><span>' + \
          (f'<a href="{prev["id"]}.html">‹ {e(prev["example"])}</a> ' if prev else "") + \
          (f'<a href="{nxt["id"]}.html">{e(nxt["example"])} ›</a>' if nxt else "") + "</span></nav>"
    body = f"""{nav}<header class="hero"><div class="brand">{BRAND} · Группа {int(g['id'])} из {len(GROUPS)}</div>
<span class="pattern">{e(g['pattern'])}</span><h1>{e(g['title'])}</h1>
<div class="example">{e(g['example'])}</div><p class="rule">{g['rule']}</p><div class="tip">{g['tip']}</div></header>
<div class="tabs" id="tabs"></div><div id="panels"></div>
<script>window.GROUP={json.dumps(data, ensure_ascii=False)};</script><script src="../assets/app.js"></script>"""
    with open(os.path.join(ROOT, "groups", f"{g['id']}.html"), "w", encoding="utf-8") as f:
        f.write(page(f"{g['example']} — неправильные глаголы", body, 1))

# ---- index (distribution)
total = sum(len(g["verbs"]) for g in GROUPS)
cards = "".join(f"""<a class="gcard" href="groups/{g['id']}.html"><div class="n">Группа {int(g['id'])}</div>
<div class="p">{e(g['pattern'])}</div><div class="e">{e(g['example'])}</div><div class="cnt">{len(g['verbs'])} глаг. · {e(g['title'])}</div></a>""" for g in GROUPS)
dist = ""
for g in GROUPS:
    rows = "".join(f"<tr>" + "".join(f'<td><span class="f c{i+1}">{e(t[i])}</span><span class="ipa">[{e(t[i+3])}]</span></td>' for i in range(3)) +
                   f'<td class="ru">{e(t[6])}</td></tr>' for t in g["verbs"])
    dist += f"""<h3><a href="groups/{g['id']}.html">{int(g['id'])}. {e(g['pattern'])} — {e(g['title'])}</a></h3>
<p class="lead">{g['rule']}</p><table class="vt"><thead><tr><th>V1</th><th>V2</th><th>V3</th><th>Перевод</th></tr></thead><tbody>{rows}</tbody></table>"""
body = f"""<header class="hero"><div class="brand">{BRAND}</div><h1>Неправильные глаголы по группам чередований</h1>
<p class="rule">{total} самых нужных неправильных глаголов уровня B1–B2, разложенных на {len(GROUPS)} групп по одинаковому чередованию звуков.
Учить глаголы «семьями» в разы легче, чем по алфавиту: запомнили одну модель — знаете всю группу.</p>
<div class="tip">В каждой группе: таблица с озвучкой, карточки, три формы по переводу, диктант на слух, выбор формы, предложения и история с пропусками.</div></header>
<h2>Выберите группу</h2><div class="grid">{cards}</div>
<section class="panel active dist"><h2>Распределение глаголов по группам</h2>
<div class="legend"><span class="c1">● V1 — инфинитив</span><span class="c2">● V2 — Past Simple</span><span class="c3">● V3 — Past Participle</span></div>{dist}</section>"""
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(page("Неправильные глаголы по группам чередований", body))

# ---- distribution files (markdown + csv)
md = [f"# Неправильные глаголы B1–B2 по группам чередований\n\n{total} глаголов · {len(GROUPS)} групп\n"]
for g in GROUPS:
    md.append(f"\n## {int(g['id'])}. {g['pattern']} — {g['title']}\n\n{re.sub('<[^>]+>', '', g['rule'])}\n\n| V1 | V2 | V3 | Транскрипция | Перевод |\n|---|---|---|---|---|")
    md += [f"| {t[0]} | {t[1]} | {t[2]} | [{t[3]}] – [{t[4]}] – [{t[5]}] | {t[6]} |" for t in g["verbs"]]
with open(os.path.join(ROOT, "groups.md"), "w", encoding="utf-8") as f: f.write("\n".join(md) + "\n")
with open(os.path.join(ROOT, "verbs.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f); w.writerow(["Группа", "Модель", "V1", "V2", "V3", "IPA V1", "IPA V2", "IPA V3", "Перевод"])
    for g in GROUPS:
        for t in g["verbs"]: w.writerow([int(g["id"]), g["pattern"], *t[:7]])

print(f"{len(GROUPS)} groups, {total} verbs")
if problems:
    print("PROBLEMS:"); [print(" -", p) for p in problems]; sys.exit(1)
