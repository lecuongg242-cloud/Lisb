"""Ghép cặp câu Anh-Việt từ các file xuất của Tatoeba. Dùng: python -I pairs.py <thư mục ref>"""
import bz2
import io
import sys
import tarfile

ref = sys.argv[1]


def load(name):
    out = {}
    with bz2.open(f"{ref}/{name}", "rt", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 3:
                out[parts[0]] = parts[2]
    return out


vie = load("vie_sentences.tsv.bz2")
eng = load("eng_sentences.tsv.bz2")
print("vie", len(vie), "eng", len(eng))

n = 0
with tarfile.open(f"{ref}/links.tar.bz2", "r:bz2") as tar, io.open(f"{ref}/eng-vie.tsv", "w", encoding="utf-8", newline="\n") as out:
    for member in tar:
        if not member.isfile():
            continue
        f = tar.extractfile(member)
        for raw in f:
            a, _, b = raw.decode("ascii", "replace").strip().partition("\t")
            if a in eng and b in vie:
                out.write(f"{eng[a]}\t{vie[b]}\n")
                n += 1
print("pairs", n)
