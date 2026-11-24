// Đối chiếu phiên âm trong bài học (lấy từ ipa-dict) với phiên âm giọng Mỹ của espeak-ng,
// bộ chuyển chữ thành âm mà model giọng đọc Kokoro dùng. In ra các từ mà hai bên khác nhau.
//
//   node tools/audio/ipa-check.mjs            chỉ báo cáo
//   node tools/audio/ipa-check.mjs --write    ghi thêm tools/content/ipa-preferred.json
//
// ipa-dict thường có nhiều cách đọc cho một từ và công cụ nội dung lấy cách đầu tiên. Khi cách đầu tiên
// không khớp giọng đọc mà một cách khác khớp, file ipa-preferred.json bảo công cụ nội dung dùng cách khớp.
//
// Khác nhau chưa chắc là sai: hai nguồn có quy ước ký hiệu riêng. Phần chuẩn hóa bên dưới bỏ các khác biệt
// thuần ký hiệu (dấu trọng âm, độ dài, ɹ và r, ɚ và ər...) để chỉ còn lại khác biệt về âm.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { phonemize } from "phonemizer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT = path.join(ROOT, "content");
const DICT = path.join(ROOT, "tools", "content", "data", "en_US.txt");

const dict = new Map();
for (const line of fs.readFileSync(DICT, "utf8").split("\n")) {
  const [word, prons] = line.split("\t");
  if (word && prons) dict.set(word.toLowerCase(), prons.split(",").map((p) => p.trim()));
}

/** Bỏ khác biệt thuần ký hiệu giữa ipa-dict và espeak-ng. */
function simplify(ipa) {
  return ipa
    .replace(/[\/ˈˌː.\s]/g, "")
    .replace(/ɹ/g, "r")
    .replace(/ɫ/g, "l")
    .replace(/ɚ|ɝ/g, "ər")
    .replace(/ɜr/g, "ər")
    .replace(/ɾ/g, "t")
    .replace(/ᵻ|ɨ/g, "ɪ")
    .replace(/ɐ/g, "ə")
    .replace(/ʌ/g, "ə")
    .replace(/oʊ/g, "o")
    .replace(/eɪ/g, "e")
    .replace(/ɡ/g, "g")
    .replace(/əl/g, "l")
    .replace(/ən/g, "n")
    .replace(/ɔr/g, "or")
    .replace(/ɑr/g, "ar")
    .replace(/ɔ/g, "ɑ")
    .replace(/i$/g, "ɪ");
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "build" ? [] : walk(p);
    return e.name.endsWith(".json") ? [p] : [];
  });
}

const PREFERRED = path.join(ROOT, "tools", "content", "ipa-preferred.json");
const rows = [];
const preferred = {};
let total = 0;
for (const file of walk(CONTENT)) {
  const unit = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const lesson of unit.lessons) {
    for (const w of lesson.words) {
      total++;
      const shown = w.pronunciation ? [w.pronunciation] : (dict.get(w.lemma.toLowerCase()) ?? []);
      const spoken = (await phonemize(w.lemma, "en-us")).join(" ");
      const match = shown.findIndex((s) => simplify(s) === simplify(spoken));
      if (match > 0) preferred[w.lemma.toLowerCase()] = shown[match];
      if (match < 0) rows.push({ unit: unit.unit, lemma: w.lemma, shown: shown.join(", ") || "(không có)", spoken, manual: Boolean(w.pronunciation) });
    }
  }
}

const picked = Object.entries(preferred).sort(([a], [b]) => a.localeCompare(b));
console.log(`${total} từ. ${picked.length} từ dùng cách đọc không phải đầu tiên trong ipa-dict:`);
for (const [lemma, pron] of picked) console.log(`  ${lemma.padEnd(12)} ${pron}`);
if (process.argv.includes("--write")) {
  fs.writeFileSync(PREFERRED, JSON.stringify(Object.fromEntries(picked), null, 2) + "\n");
  console.log(`Đã ghi ${path.relative(ROOT, PREFERRED)}`);
}
console.log(`\n${rows.length} từ không có cách đọc nào trong ipa-dict khớp với espeak-ng en-us (cần người xem):\n`);
for (const r of rows) console.log(`${r.unit.padEnd(26)} ${r.lemma.padEnd(12)} bài: ${r.shown.padEnd(28)} espeak: /${r.spoken}/${r.manual ? "  (nhập tay)" : ""}`);
