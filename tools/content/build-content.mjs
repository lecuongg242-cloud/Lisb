// Kiểm tra nội dung bài học (content/<khóa>/<cấp>/*.json) và sinh file SQL nạp vào database.
//
//   node tools/content/build-content.mjs            kiểm tra + sinh content/build/*.sql
//   node tools/content/build-content.mjs --check    chỉ kiểm tra
//
// Dữ liệu đối chiếu (tự tải về tools/content/data/ nếu chưa có):
//   - ipa-dict en_US (MIT): phiên âm IPA. https://github.com/open-dict-data/ipa-dict
//   - CEFR-J Vocabulary Profile 1.5 (Tono Laboratory, TUFS; dùng tự do kèm trích dẫn): cấp của từ.
//     https://github.com/openlanguageprofiles/olp-en-cefrj
//
// File SQL sinh ra chạy lại nhiều lần được (upsert). Bài học luôn ở trạng thái draft;
// xuất bản là bước riêng.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = path.join(ROOT, "content");
const BUILD_DIR = path.join(CONTENT_DIR, "build");
const DATA_DIR = path.join(ROOT, "tools", "content", "data");
const CHECK_ONLY = process.argv.includes("--check");

const SOURCES = {
  "en_US.txt": "https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt",
  "cefrj.csv": "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv",
};

// Quy tắc theo cấp: số câu mỗi bài, khoảng số từ mới, số từ tối đa trong một câu, cấp CEFR cao nhất cho phép.
const LEVEL_RULES = {
  "pre-a1": { sentences: 5, minWords: 5, maxWords: 8, maxSentenceTokens: 8, maxCefr: "A1" },
  a1: { sentences: 5, minWords: 5, maxWords: 8, maxSentenceTokens: 10, maxCefr: "A1" },
  a2: { sentences: 5, minWords: 5, maxWords: 8, maxSentenceTokens: 14, maxCefr: "A2" },
};
const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TARGET_LOCALE = "en-US";
const REQUIRED_LOCALES = ["vi", TARGET_LOCALE];

async function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const [file, url] of Object.entries(SOURCES)) {
    const dest = path.join(DATA_DIR, file);
    if (fs.existsSync(dest)) continue;
    console.log(`Tải ${file} ...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Không tải được ${url}: ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }
}

function loadIpa() {
  const map = new Map();
  for (const line of fs.readFileSync(path.join(DATA_DIR, "en_US.txt"), "utf8").split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const word = line.slice(0, tab).toLowerCase();
    if (!map.has(word)) map.set(word, line.slice(tab + 1).split(",")[0].trim());
  }
  return map;
}

function loadCefr() {
  const map = new Map();
  const lines = fs.readFileSync(path.join(DATA_DIR, "cefrj.csv"), "utf8").split("\n").slice(1);
  for (const line of lines) {
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

// ID cố định sinh từ khóa ổn định (không phải từ nội dung), nên sửa chữ không làm đổi ID.
function stableId(...parts) {
  const h = crypto.createHash("sha1").update("lisb|" + parts.join("|")).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const qArr = (arr) => (arr && arr.length ? `array[${arr.map(q).join(", ")}]::text[]` : `'{}'::text[]`);

function tokenize(text) {
  return text
    .replace(/[‘’]/g, "'")
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter(Boolean);
}

function readUnits() {
  const units = [];
  for (const course of fs.readdirSync(CONTENT_DIR)) {
    if (course === "build") continue;
    const courseDir = path.join(CONTENT_DIR, course);
    if (!fs.statSync(courseDir).isDirectory()) continue;
    for (const level of fs.readdirSync(courseDir)) {
      const levelDir = path.join(courseDir, level);
      if (!fs.statSync(levelDir).isDirectory()) continue;
      for (const file of fs.readdirSync(levelDir).filter((f) => f.endsWith(".json")).sort()) {
        const data = JSON.parse(fs.readFileSync(path.join(levelDir, file), "utf8"));
        units.push({ file: path.join(course, level, file), data });
      }
    }
  }
  return units;
}

function build(units, ipa, cefr) {
  const errors = [];
  const warnings = [];
  const outputs = new Map(); // "course-level" -> sql lines
  const known = new Map(); // "course" -> Map(surface lowercase -> word)
  const stats = [];
  const overrides = [];

  for (const { file, data } of units) {
    const err = (m) => errors.push(`${file}: ${m}`);
    const warn = (m) => warnings.push(`${file}: ${m}`);
    const rules = LEVEL_RULES[data.level];
    if (!rules) { err(`chưa có quy tắc cho cấp "${data.level}"`); continue; }

    const outKey = `${data.course}-${data.level}`;
    if (!outputs.has(outKey)) outputs.set(outKey, []);
    const sql = outputs.get(outKey);
    if (!known.has(data.course)) known.set(data.course, new Map());
    const vocab = known.get(data.course);
    const names = new Set((data.names ?? []).map((n) => n.toLowerCase()));

    const courseSql = `(select id from public.courses where slug = ${q(data.course)})`;
    const unitSql =
      `(select u.id from public.units u join public.levels l on l.id = u.level_id ` +
      `join public.courses c on c.id = l.course_id ` +
      `where c.slug = ${q(data.course)} and l.code = ${q(data.level)} and u.slug = ${q(data.unit)})`;

    const emitWord = (w, where) => {
      const id = stableId("word", data.course, w.lemma, w.pos);
      // Phiên âm lấy từ ipa-dict. Trường pronunciation trong JSON chỉ dùng khi từ điển không áp dụng được
      // (ví dụ tên chữ cái: từ điển chỉ có phiên âm của từ "a", không có tên chữ "A").
      if (w.pronunciation) overrides.push(w.lemma);
      const pron = w.pronunciation ?? ipa.get(w.lemma.toLowerCase()) ?? null;
      const level = cefr.get(w.lemma.toLowerCase()) ?? null;
      if (!pron) warn(`${where}: từ "${w.lemma}" không có phiên âm trong ipa-dict`);
      if (!["proper noun", "contraction", "letter"].includes(w.pos)) {
        if (!level) warn(`${where}: từ "${w.lemma}" không có trong CEFR-J`);
        else if (CEFR_ORDER.indexOf(level) > CEFR_ORDER.indexOf(rules.maxCefr))
          warn(`${where}: từ "${w.lemma}" ở cấp ${level}, cao hơn ${rules.maxCefr}`);
      }
      for (const loc of REQUIRED_LOCALES)
        if (!w.meaning?.[loc]) err(`${where}: từ "${w.lemma}" thiếu nghĩa ${loc}`);

      sql.push(
        `insert into public.words (id, course_id, lemma, part_of_speech, pronunciation, level_tag) values ` +
          `(${q(id)}, ${courseSql}, ${q(w.lemma)}, ${q(w.pos)}, ${q(pron)}, ${q(level)}) ` +
          `on conflict (id) do update set pronunciation = excluded.pronunciation, level_tag = excluded.level_tag;`,
      );
      for (const loc of Object.keys(w.meaning ?? {})) {
        sql.push(
          `insert into public.word_translations (word_id, locale, meaning, accepted_forms, usage_note, source_hash) values ` +
            `(${q(id)}, ${q(loc)}, ${q(w.meaning[loc])}, ${qArr(w.accepted?.[loc])}, ${q(w.usage_note?.[loc])}, ${q(sha1(w.lemma))}) ` +
            `on conflict (word_id, locale) do update set meaning = excluded.meaning, accepted_forms = excluded.accepted_forms, ` +
            `usage_note = excluded.usage_note, source_hash = excluded.source_hash, status = 'ok';`,
        );
      }
      const entry = { id, lemma: w.lemma, pos: w.pos };
      for (const surface of [w.lemma, ...(w.forms ?? [])]) vocab.set(surface.toLowerCase(), entry);
      return entry;
    };

    sql.push(``, `-- ===== ${data.unit} (${file.replace(/\\/g, "/")}) =====`);

    for (const w of data.assumed_words ?? []) {
      if (vocab.has(w.lemma.toLowerCase())) continue;
      warn(`từ "${w.lemma}" được coi là đã dạy ở chủ đề "${w.from_unit}" (chủ đề đó chưa soạn)`);
      emitWord(w, "assumed_words");
    }

    const lessonKeys = new Set();
    data.lessons.forEach((lesson, li) => {
      const where = `bài ${li + 1} (${lesson.key})`;
      if (lessonKeys.has(lesson.key)) err(`${where}: trùng key bài học`);
      lessonKeys.add(lesson.key);
      const lessonId = stableId("lesson", data.course, data.unit, lesson.key);

      if (lesson.sentences.length !== rules.sentences)
        err(`${where}: có ${lesson.sentences.length} câu, cần ${rules.sentences}`);
      if (lesson.words.length < rules.minWords || lesson.words.length > rules.maxWords)
        err(`${where}: có ${lesson.words.length} từ mới, cần ${rules.minWords}-${rules.maxWords}`);
      for (const loc of REQUIRED_LOCALES) {
        if (!lesson.title?.[loc]) err(`${where}: thiếu tiêu đề ${loc}`);
        if (!lesson.grammar_tip?.[loc]) err(`${where}: thiếu mẹo ngữ pháp ${loc}`);
        if (!lesson.pronunciation_tip?.[loc]) err(`${where}: thiếu mẹo phát âm ${loc}`);
      }

      sql.push(
        ``,
        `-- Bài ${li + 1}: ${lesson.title?.vi ?? lesson.key}`,
        `insert into public.lessons (id, unit_id, sort_order, kind) values (${q(lessonId)}, ${unitSql}, ${li + 1}, 'lesson') ` +
          `on conflict (id) do update set sort_order = excluded.sort_order;`,
      );
      for (const loc of Object.keys(lesson.title ?? {})) {
        sql.push(
          `insert into public.lesson_translations (lesson_id, locale, title, grammar_tip, pronunciation_tip) values ` +
            `(${q(lessonId)}, ${q(loc)}, ${q(lesson.title[loc])}, ${q(lesson.grammar_tip?.[loc])}, ${q(lesson.pronunciation_tip?.[loc])}) ` +
            `on conflict (lesson_id, locale) do update set title = excluded.title, grammar_tip = excluded.grammar_tip, ` +
            `pronunciation_tip = excluded.pronunciation_tip, status = 'ok';`,
        );
      }

      // Từ mới của bài.
      const newWords = [];
      for (const w of lesson.words) {
        // Cùng chữ viết nhưng khác từ loại (chữ cái A và mạo từ a) là hai từ khác nhau;
        // từ dạy sau được dùng khi tách các câu về sau.
        if (vocab.get(w.lemma.toLowerCase())?.pos === w.pos) err(`${where}: từ "${w.lemma}" đã được dạy ở bài trước`);
        newWords.push({ ...emitWord(w, where), used: false, exampleSentenceId: null });
      }
      const newById = new Map(newWords.map((w) => [w.id, w]));

      // Câu mẫu.
      const sentenceKeys = new Set();
      const sentenceIds = [];
      const sentenceWordRows = [];
      lesson.sentences.forEach((s, si) => {
        const sWhere = `${where}, câu ${si + 1} "${s.text}"`;
        if (sentenceKeys.has(s.key)) err(`${sWhere}: trùng key câu`);
        sentenceKeys.add(s.key);
        const sentenceId = stableId("sentence", data.course, data.unit, lesson.key, s.key);
        sentenceIds.push(sentenceId);
        if (!s.translation?.vi) err(`${sWhere}: thiếu bản dịch vi`);

        const tokens = tokenize(s.text);
        if (tokens.length > rules.maxSentenceTokens)
          err(`${sWhere}: dài ${tokens.length} từ, tối đa ${rules.maxSentenceTokens}`);
        tokens.forEach((tok, pos) => {
          const lower = tok.toLowerCase();
          if (names.has(lower)) return;
          const word = vocab.get(lower);
          if (!word) { err(`${sWhere}: từ "${tok}" chưa được dạy`); return; }
          sentenceWordRows.push(`(${q(sentenceId)}, ${pos + 1}, ${q(word.id)}, ${q(tok)})`);
          const nw = newById.get(word.id);
          if (nw) { nw.used = true; nw.exampleSentenceId ??= sentenceId; }
        });

        sql.push(
          `insert into public.sentences (id, lesson_id, sort_order, text, accepted_forms) values ` +
            `(${q(sentenceId)}, ${q(lessonId)}, ${si + 1}, ${q(s.text)}, ${qArr(s.accepted)}) ` +
            `on conflict (id) do update set sort_order = excluded.sort_order, text = excluded.text, accepted_forms = excluded.accepted_forms;`,
        );
        const locales = new Set([...Object.keys(s.translation ?? {}), ...Object.keys(s.note ?? {})]);
        for (const loc of locales) {
          // Dòng của ngôn ngữ đích chỉ để giữ ghi chú; text lặp lại câu gốc.
          const text = s.translation?.[loc] ?? (loc === TARGET_LOCALE ? s.text : null);
          if (!text) { err(`${sWhere}: có ghi chú ${loc} nhưng thiếu bản dịch ${loc}`); continue; }
          sql.push(
            `insert into public.sentence_translations (sentence_id, locale, text, accepted_forms, note, source_hash) values ` +
              `(${q(sentenceId)}, ${q(loc)}, ${q(text)}, ${qArr(s.accepted_translation?.[loc])}, ${q(s.note?.[loc])}, ${q(sha1(s.text))}) ` +
              `on conflict (sentence_id, locale) do update set text = excluded.text, accepted_forms = excluded.accepted_forms, ` +
              `note = excluded.note, source_hash = excluded.source_hash, status = 'ok';`,
          );
        }
      });

      for (const w of newWords) if (!w.used) err(`${where}: từ mới "${w.lemma}" không xuất hiện trong câu nào của bài`);

      // Hai bảng nối được thay toàn bộ theo bài để không sót dòng cũ khi sửa câu.
      sql.push(`delete from public.sentence_words where sentence_id in (${sentenceIds.map(q).join(", ")});`);
      if (sentenceWordRows.length)
        sql.push(`insert into public.sentence_words (sentence_id, position, word_id, surface) values\n  ${sentenceWordRows.join(",\n  ")};`);
      sql.push(`delete from public.lesson_words where lesson_id = ${q(lessonId)};`);
      sql.push(
        `insert into public.lesson_words (lesson_id, word_id, sort_order, example_sentence_id) values\n  ` +
          newWords.map((w, i) => `(${q(lessonId)}, ${q(w.id)}, ${i + 1}, ${q(w.exampleSentenceId)})`).join(",\n  ") + `;`,
      );

      stats.push({ unit: data.unit, lesson: lesson.key, words: lesson.words.length, sentences: lesson.sentences.length });
    });
  }
  return { errors, warnings, outputs, stats, overrides };
}

await ensureData();
const { errors, warnings, outputs, stats, overrides } = build(readUnits(), loadIpa(), loadCefr());

console.log(`\nĐã đọc ${stats.length} bài học:`);
for (const s of stats) console.log(`  ${s.unit} / ${s.lesson}: ${s.words} từ mới, ${s.sentences} câu`);
if (overrides.length) console.log(`\nPhiên âm nhập tay (không lấy từ ipa-dict): ${overrides.length} từ: ${overrides.join(", ")}`);
console.log(`\nCảnh báo: ${warnings.length}`);
for (const w of warnings) console.log(`  - ${w}`);
console.log(`\nLỗi: ${errors.length}`);
for (const e of errors) console.log(`  - ${e}`);

if (errors.length) {
  console.log("\nCó lỗi, không sinh file SQL.");
  process.exit(1);
}
if (!CHECK_ONLY) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  for (const [key, lines] of outputs) {
    const file = path.join(BUILD_DIR, `${key}.sql`);
    const header = [
      `-- FILE SINH TỰ ĐỘNG bởi tools/content/build-content.mjs. Không sửa tay; sửa file JSON rồi sinh lại.`,
      `-- Chạy lại nhiều lần được. Bài học ở trạng thái draft cho tới khi xuất bản.`,
    ];
    fs.writeFileSync(file, [...header, ...lines, ""].join("\n"));
    console.log(`\nĐã sinh ${path.relative(ROOT, file)}`);
  }
}
