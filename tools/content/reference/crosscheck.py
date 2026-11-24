"""Đối chiếu nội dung cấp Khởi động với danh sách từ Starters và cặp câu Tatoeba.
Dùng: python -I crosscheck.py <gốc dự án> <tệp báo cáo>"""
import glob
import io
import json
import re
import sys
from collections import defaultdict

root, report = sys.argv[1], sys.argv[2]
ref = f"{root}/tools/content/data/ref"
out = io.open(report, "w", encoding="utf-8", newline="\n")


def p(*a):
    out.write(" ".join(str(x) for x in a) + "\n")


def norm(s):
    s = s.lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def vnorm(s):
    s = s.lower()
    s = re.sub(r"[.,!?;:\"“”()…]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# --- Starters: mọi chữ xuất hiện trong phần danh sách theo bảng chữ cái ---
txt = io.open(f"{ref}/starters.txt", encoding="latin-1").read()
txt = txt[txt.index("Grammatical key"):]
starters = set(re.findall(r"[a-z]+(?:'[a-z]+)?", txt.lower()))

# --- Tatoeba ---
by_en = defaultdict(set)
for line in io.open(f"{ref}/eng-vie.tsv", encoding="utf-8"):
    en, _, vi = line.rstrip("\n").partition("\t")
    by_en[norm(en)].add(vi)
# nghĩa của từ: câu Tatoeba chỉ gồm đúng một từ
p("Starters tokens:", len(starters), "| Tatoeba distinct EN:", len(by_en))

words, sentences = [], []
for path in sorted(glob.glob(f"{root}/content/english/pre-a1/*.json")):
    d = json.load(io.open(path, encoding="utf-8"))
    for lesson in d["lessons"]:
        for w in lesson["words"]:
            words.append((d["unit"], lesson["key"], w))
        for s in lesson["sentences"]:
            sentences.append((d["unit"], lesson["key"], s))


p(f"\n== 1. TỪ ({len(words)}) KHÔNG CÓ TRONG DANH SÁCH STARTERS ==")
missing = []
for unit, key, w in words:
    lemma = w.get("lemma") or w.get("text")
    parts = re.findall(r"[a-z]+(?:'[a-z]+)?", lemma.lower())
    if not all(x in starters for x in parts):
        missing.append((unit, lemma, w.get("level") or w.get("level_tag") or w.get("cefr")))
for unit, lemma, lvl in missing:
    p(f"  {unit:28} {lemma:16} {lvl}")
p("  tổng:", len(missing))

p(f"\n== 2. CÂU ({len(sentences)}) ĐỐI CHIẾU TATOEBA ==")
hit = 0
for unit, key, s in sentences:
    text = s.get("text") or s.get("en")
    tr = s.get("translation") or s.get("meaning") or {}
    vi = tr.get("vi") if isinstance(tr, dict) else tr
    cands = by_en.get(norm(text))
    if not cands:
        continue
    hit += 1
    same = any(vnorm(c) == vnorm(vi or "") for c in cands)
    p(f"  [{'khớp' if same else 'KHÁC'}] {text}  |  bài: {vi}  |  Tatoeba: {' / '.join(sorted(cands)[:4])}")
p("  câu có trong Tatoeba:", hit, "/", len(sentences))

p("\n== 3. NGHĨA CỦA TỪ ĐỐI CHIẾU TATOEBA (câu một từ) ==")
for unit, key, w in words:
    lemma = w.get("lemma") or w.get("text")
    cands = by_en.get(norm(lemma))
    if cands:
        m = w.get("meaning")
        vi = m.get("vi") if isinstance(m, dict) else m
        p(f"  {lemma:14} bài: {vi}  |  Tatoeba: {' / '.join(sorted(cands)[:5])}")
out.close()
