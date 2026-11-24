// Sinh file âm thanh cho toàn bộ nội dung bài học bằng Kokoro-82M (mã nguồn mở, Apache 2.0), chạy trên máy.
//
//   cd tools/audio && npm install        (lần đầu; model tự tải về khi chạy)
//   node tools/audio/generate.mjs        sinh các file còn thiếu
//   node tools/audio/generate.mjs --force   sinh lại tất cả
//   node tools/audio/generate.mjs --redo "A" --redo "Good night!"   sinh lại riêng các đoạn này (cả hai giọng)
//
// Sửa một file đọc sai (quản trị đánh dấu ở trang Quản trị > Âm thanh):
//   1. Thêm vào tools/audio/overrides.json cách viết khác để model đọc đúng, ví dụ { "english": { "A": "ay" } }.
//      Model đọc cách viết đó, nhưng file vẫn mang khóa của văn bản gốc nên app không phải đổi gì.
//   2. Chạy lại với --redo "<văn bản gốc>" rồi nghe lại ở trang quản trị.
//
// Kết quả: public/audio/<giọng>/<khóa>.mp3, trong đó khóa = 20 ký tự đầu của sha1(văn bản).
// App tính khóa theo đúng công thức này (lib/audio/key.ts), nên không cần bảng tra.
// Câu nào đổi chữ thì khóa đổi và chỉ câu đó được sinh lại.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Mp3Encoder } from "@breezystack/lamejs";
import { KokoroTTS } from "kokoro-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_DIR = path.join(ROOT, "public", "audio");
const FORCE = process.argv.includes("--force");
const REDO = new Set(process.argv.flatMap((arg, i, all) => (arg === "--redo" && all[i + 1] ? [all[i + 1]] : [])));
const OVERRIDES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "overrides.json");
/** Cách viết thay thế để model đọc đúng: { "<khóa học>": { "<văn bản gốc>": "<văn bản đưa cho model>" } }. */
const OVERRIDES = fs.existsSync(OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8")) : {};

// Giọng theo khóa học. Tên thư mục trùng với cấu hình trong lib/audio/voices.ts.
const VOICES_BY_COURSE = { english: ["af_heart", "am_michael"] };
const MP3_KBPS = 48;

const audioKey = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 20);

// Tách từ giống lib/lang/en.ts để có âm thanh cho từng từ khi người học chạm vào từ trong câu.
const tokenize = (text) =>
  text
    .replace(/[‘’ʼ`]/g, "'")
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter(Boolean);

function collectTexts() {
  const byCourse = new Map();
  for (const course of fs.readdirSync(CONTENT_DIR)) {
    const courseDir = path.join(CONTENT_DIR, course);
    if (course === "build" || !fs.statSync(courseDir).isDirectory()) continue;
    const texts = new Set();
    for (const level of fs.readdirSync(courseDir)) {
      const levelDir = path.join(courseDir, level);
      if (!fs.statSync(levelDir).isDirectory()) continue;
      for (const file of fs.readdirSync(levelDir).filter((f) => f.endsWith(".json"))) {
        const unit = JSON.parse(fs.readFileSync(path.join(levelDir, file), "utf8"));
        for (const word of unit.assumed_words ?? []) texts.add(word.lemma);
        for (const lesson of unit.lessons) {
          for (const word of lesson.words) texts.add(word.lemma);
          for (const sentence of lesson.sentences) {
            texts.add(sentence.text);
            for (const token of tokenize(sentence.text)) texts.add(token);
          }
        }
      }
    }
    byCourse.set(course, [...texts]);
  }
  return byCourse;
}

function toMp3(samples, sampleRate) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = encoder.encodeBuffer(pcm.subarray(i, i + 1152));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

const byCourse = collectTexts();
let tts = null;
let created = 0;
let skipped = 0;
let bytes = 0;

for (const [course, texts] of byCourse) {
  const voices = VOICES_BY_COURSE[course];
  if (!voices) {
    console.log(`Bỏ qua khóa "${course}": chưa khai báo giọng đọc.`);
    continue;
  }
  for (const voice of voices) {
    const dir = path.join(OUT_DIR, voice);
    fs.mkdirSync(dir, { recursive: true });
    const wanted = new Set();
    for (const text of texts) {
      const key = audioKey(text);
      wanted.add(`${key}.mp3`);
      const file = path.join(dir, `${key}.mp3`);
      if (!FORCE && !REDO.has(text) && fs.existsSync(file)) {
        skipped++;
        continue;
      }
      tts ??= await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
      const audio = await tts.generate(OVERRIDES[course]?.[text] ?? text, { voice });
      const mp3 = toMp3(audio.audio, audio.sampling_rate);
      fs.writeFileSync(file, mp3);
      created++;
      bytes += mp3.length;
      if (created % 50 === 0) console.log(`  ${created} file...`);
    }
    const orphans = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3") && !wanted.has(f));
    console.log(`${course} / ${voice}: ${texts.length} đoạn văn bản, ${orphans.length} file không còn dùng`);
  }
}

const known = new Set([...byCourse.values()].flat());
for (const text of REDO) if (!known.has(text)) console.log(`Không tìm thấy đoạn "${text}" trong nội dung: kiểm tra lại chữ hoa, dấu câu.`);

console.log(`\nSinh mới ${created} file (${(bytes / 1024 / 1024).toFixed(1)} MB), bỏ qua ${skipped} file đã có.`);
