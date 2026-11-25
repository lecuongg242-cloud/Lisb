// Kiểm tra khung chủ đề và bài của một cấp (tools/content/syllabus/<khóa>-<cấp>.json) trước khi soạn bài.
//
//   node tools/content/syllabus-check.mjs                     kiểm tra english-a1
//   node tools/content/syllabus-check.mjs english-a2
//
// Báo lỗi: bài có ít hơn 5 hoặc nhiều hơn 8 từ, từ đã dạy ở cấp trước hoặc ở bài trước trong khung.
// Báo để xem lại: từ không có trong CEFR-J hoặc ở cấp cao hơn cấp đang soạn.
// Liệt kê: từ CEFR-J của cấp này chưa được xếp vào bài nào (để dành cho nhánh Từ vựng theo cấp CEFR).
//
// Nếu có danh sách từ Cambridge đã chuyển sang chữ ở tools/content/data/ref/movers.txt
// (xem tools/content/reference/README.md) thì in thêm nhãn Starters/Movers/Flyers của từng từ.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_DIR = path.join(ROOT, "tools", "content", "data");
const CEFRJ_URL = "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv";
const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LEVEL_ORDER = ["pre-a1", "a1", "a2", "b1", "b2"];
const NO_CEFR_POS = new Set(["proper noun", "contraction", "letter"]);
const MIN_WORDS = 5;
const MAX_WORDS = 8;

const name = process.argv[2] ?? "english-a1";
const syllabus = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "syllabus", `${name}.json`), "utf8"));
const targetCefr = syllabus.level.toUpperCase();

async function loadCefr() {
  const file = path.join(DATA_DIR, "cefrj.csv");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const res = await fetch(CEFRJ_URL);
    if (!res.ok) throw new Error(`Không tải được CEFR-J: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const map = new Map(); // từ -> cấp thấp nhất
  for (const line of fs.readFileSync(file, "utf8").split("\n").slice(1)) {
    const [headword, , level] = line.split(",");
    if (!headword || !CEFR_ORDER.includes(level)) continue;
    for (const variant of headword.split("/")) {
      const key = variant.trim().toLowerCase();
      const prev = map.get(key);
      if (!prev || CEFR_ORDER.indexOf(level) < CEFR_ORDER.indexOf(prev)) map.set(key, level);
    }
  }
  return map;
}

function loadCambridge() {
  const file = path.join(DATA_DIR, "ref", "movers.txt");
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "latin1");
  const start = text.indexOf("Pre A1 Starters, A1 Movers and A2 Flyers alphabetic vocabulary list\n");
  const end = text.indexOf("Pre A1 Starters, A1 Movers and A2 Flyers grammatical vocabulary list", start + 100);
  if (start < 0 || end < 0) return null;
  const tags = new Map();
  const cell = /^(.+?)\s+(?:n|v|adj|adv|prep|pron|det|conj|excl|int|dis|poss)\b.*?\s([SMF])$/;
  for (const line of text.slice(start, end).split("\n")) {
    for (const part of line.trim().split(/\s{2,}/)) {
      const m = part.match(cell);
      if (!m) continue;
      for (const w of m[1].replace(/\s*\(.*?\)/g, "").split("/")) {
        const key = w.trim().toLowerCase();
        if (!tags.has(key)) tags.set(key, m[2]);
      }
    }
  }
  return tags;
}

// Từ đã dạy ở các cấp trước, đọc từ nội dung đã soạn.
function loadTaught() {
  const taught = new Map(); // lemma thường -> Set(từ loại)
  const courseDir = path.join(ROOT, "content", syllabus.course);
  const before = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(syllabus.level));
  for (const level of before) {
    const dir = path.join(courseDir, level);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      for (const lesson of data.lessons)
        for (const w of lesson.words) add(taught, w.lemma, w.pos, `${level}/${data.unit}`);
    }
  }
  return taught;
}

function add(map, lemma, pos, where) {
  const key = lemma.toLowerCase();
  if (!map.has(key)) map.set(key, []);
  map.get(key).push({ pos, where });
}

const parse = (token) => {
  const i = token.indexOf("/");
  return i < 0 ? { lemma: token, pos: null } : { lemma: token.slice(0, i), pos: token.slice(i + 1) };
};

const cefr = await loadCefr();
const cambridge = loadCambridge();
const seen = loadTaught();
const taughtCount = [...seen.values()].reduce((n, xs) => n + xs.length, 0);

const errors = [];
const review = [];
const inSyllabus = new Set();
let total = 0;
const levelCount = new Map();

syllabus.units.forEach((unit, ui) => {
  console.log(`\n${ui + 1}. ${unit.title} (${unit.key})`);
  unit.lessons.forEach((lesson, li) => {
    const where = `${unit.key}/${lesson.key}`;
    const n = lesson.words.length;
    if (n < MIN_WORDS || n > MAX_WORDS) errors.push(`${where}: có ${n} từ, cần ${MIN_WORDS}-${MAX_WORDS}`);
    const cells = lesson.words.map((token) => {
      const { lemma, pos } = parse(token);
      const key = lemma.toLowerCase();
      const earlier = seen.get(key) ?? [];
      // Cùng chữ viết chỉ được dạy lại khi cả hai bên đều ghi từ loại và từ loại khác nhau.
      const clash = earlier.find((e) => !pos || !e.pos || e.pos === pos);
      if (clash) errors.push(`${where}: "${lemma}" đã dạy ở ${clash.where}${clash.pos ? ` (${clash.pos})` : ""}`);
      add(seen, lemma, pos, where);
      inSyllabus.add(key);
      total++;

      let level = "-";
      if (!NO_CEFR_POS.has(pos)) {
        level = cefr.get(key) ?? "?";
        levelCount.set(level, (levelCount.get(level) ?? 0) + 1);
        if (level === "?") review.push(`${where}: "${lemma}" không có trong CEFR-J`);
        else if (CEFR_ORDER.indexOf(level) > CEFR_ORDER.indexOf(targetCefr))
          review.push(`${where}: "${lemma}" ở cấp ${level}`);
      }
      const cam = cambridge ? (cambridge.get(key) ?? "-") : "";
      return `${lemma}${level === "A1" || level === "-" ? "" : ` [${level}]`}${cam && cam !== "-" ? ` ${cam}` : ""}`;
    });
    console.log(`   ${ui + 1}.${li + 1} ${lesson.title} (${n}): ${cells.join(", ")}`);
  });
});

const leftover = [...cefr.entries()]
  .filter(([w, level]) => level === targetCefr && !seen.has(w) && !inSyllabus.has(w))
  .map(([w]) => w)
  .sort();

console.log(`\nTổng: ${syllabus.units.length} chủ đề, ${syllabus.units.reduce((n, u) => n + u.lessons.length, 0)} bài, ${total} từ mới.`);
console.log(`Vốn từ cộng dồn: ${taughtCount} từ đã dạy ở cấp trước + ${total} = ${taughtCount + total}.`);
console.log(`Cấp CEFR-J của từ mới: ${[...levelCount.entries()].sort().map(([l, c]) => `${l} ${c}`).join(", ")}.`);
if (cambridge) console.log("Nhãn Cambridge sau mỗi từ: S Starters, M Movers, F Flyers.");
else console.log("Không có tools/content/data/ref/movers.txt nên không in nhãn Cambridge.");

console.log(`\nTừ CEFR-J ${targetCefr} chưa xếp vào bài nào (${leftover.length}), để dành cho nhánh Từ vựng theo cấp CEFR:`);
console.log(leftover.join(", "));

console.log(`\nCần xem lại: ${review.length}`);
for (const r of review) console.log(`  ${r}`);
console.log(`\nLỗi: ${errors.length}`);
for (const e of errors) console.log(`  ${e}`);
process.exit(errors.length ? 1 : 0);
