// Kiểm tra chéo nội dung bài học bằng một model khác hãng với model đã soạn (Gemini).
//
//   node tools/content/crosscheck-ai.mjs                       mọi chủ đề của mọi cấp
//   node tools/content/crosscheck-ai.mjs pre-a1                một cấp
//   node tools/content/crosscheck-ai.mjs pre-a1/02-greetings   một chủ đề
//   --model <tên>   đổi model (mặc định MODEL bên dưới)
//
// Cần GEMINI_API_KEY trong .env.local. Báo cáo ghi vào tools/content/review/<cấp>/<chủ đề>.json
// và một bản tóm tắt in ra màn hình. Báo cáo chỉ để người soạn xem và sửa; script không sửa bài.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = path.join(ROOT, "content", "english");
const REVIEW_DIR = path.join(ROOT, "tools", "content", "review");
const args = process.argv.slice(2);
const modelFlag = args.indexOf("--model");
const MODEL = modelFlag >= 0 ? args[modelFlag + 1] : "gemini-3.1-pro-preview";
const targets = args.filter((a, i) => !a.startsWith("--") && (modelFlag < 0 || i !== modelFlag + 1));

const LEVEL_NOTES = {
  "pre-a1": "Pre-A1 (khởi động, gần như số 0). Câu rất ngắn, từ thông dụng nhất.",
  a1: "A1.",
  a2: "A2.",
};

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^GEMINI_API_KEY=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("Thiếu GEMINI_API_KEY trong .env.local");
}

function listUnits() {
  const all = [];
  for (const level of fs.readdirSync(CONTENT_DIR)) {
    for (const f of fs.readdirSync(path.join(CONTENT_DIR, level))) {
      if (f.endsWith(".json")) all.push(`${level}/${f.replace(/\.json$/, "")}`);
    }
  }
  all.sort((a, b) => {
    const [la, na] = unitOrder(a);
    const [lb, nb] = unitOrder(b);
    return la - lb || na.localeCompare(nb);
  });
  if (!targets.length) return all;
  return all.filter((u) => targets.some((t) => u === t || u.startsWith(`${t}/`)));
}

const SYSTEM = `Bạn là biên tập viên giáo trình tiếng Anh cho người Việt, thông thạo tiếng Anh Mỹ và tiếng Việt chuẩn (miền Bắc).
Bạn kiểm tra bản nháp do một AI khác soạn. Người học là người Việt trưởng thành, học tiếng Anh Mỹ từ con số 0, tự học trên điện thoại.

Cấu trúc dữ liệu:
- words: lemma (từ tiếng Anh), pos (từ loại), meaning.vi (nghĩa tiếng Việt hiển thị cho người học), meaning.en-US (giải nghĩa tiếng Anh đơn giản), accepted.vi (các nghĩa tiếng Việt khác cũng được chấm đúng khi người học gõ nghĩa).
- sentences: text (câu tiếng Anh), accepted (cách viết tiếng Anh khác cũng chấm đúng), translation.vi (bản dịch hiển thị), accepted_translation.vi (bản dịch khác cũng chấm đúng), note (ghi chú cách dùng).
- grammar_tip, pronunciation_tip: mẹo ngắn bằng tiếng Việt (vi) và tiếng Anh (en-US).
- assumed_words: từ được dùng trong câu nhưng đã dạy ở bài trước. names: tên riêng.

Hãy tìm mọi lỗi thật:
1. Câu tiếng Anh sai ngữ pháp, không tự nhiên, hoặc người Mỹ không nói như vậy.
2. Nghĩa hoặc bản dịch tiếng Việt sai, lệch nghĩa, sai sắc thái, hoặc không tự nhiên.
3. accepted.vi hoặc accepted_translation.vi chứa đáp án sai nghĩa (vì sẽ chấm đúng một câu trả lời sai). Thiếu một cách nói rất phổ biến thì ghi là gợi ý.
4. accepted (tiếng Anh) chứa cách viết sai.
5. Giải nghĩa tiếng Anh (meaning.en-US) sai hoặc khó hơn mức người mới học.
6. Mẹo ngữ pháp, mẹo phát âm, ghi chú: sai sự thật, gây hiểu lầm, hoặc ký hiệu IPA sai. Lưu ý mẹo phát âm theo giọng Mỹ.
7. Từ loại (pos) sai.
8. Nội dung không hợp cấp độ hoặc không hợp người lớn.

Quy tắc báo cáo:
- Chỉ báo vấn đề thật. Không báo sở thích cá nhân về câu chữ khi bản gốc đã đúng và tự nhiên.
- severity "error": sai sự thật, sai nghĩa, sai ngữ pháp, hoặc sẽ làm người học hiểu sai / chấm sai.
- severity "suggestion": đúng nhưng chưa tự nhiên, thiếu một đáp án phổ biến, hoặc có cách giải thích rõ hơn.
- item: lemma của từ, key của câu (ví dụ "s3"), hoặc "grammar_tip" / "pronunciation_tip" / "title".
- field: đường dẫn trường, ví dụ "meaning.vi", "accepted_translation.vi", "text", "pronunciation_tip.vi".
- problem và fix viết bằng tiếng Việt; fix đưa ra nội dung thay thế cụ thể nếu có thể.
- Nếu một bài không có lỗi nào, không cần liệt kê bài đó.`;

const SCHEMA = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          lesson: { type: "string" },
          item: { type: "string" },
          field: { type: "string" },
          severity: { type: "string", enum: ["error", "suggestion"] },
          current: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
        },
        required: ["lesson", "item", "field", "severity", "current", "problem", "fix"],
      },
    },
  },
  required: ["issues"],
};

const LEVEL_ORDER = ["pre-a1", "a1", "a2", "b1", "b2"];
const unitOrder = (u) => [LEVEL_ORDER.indexOf(u.split("/")[0]), u];

// Từ đã dạy ở các chủ đề đứng trước (cùng cấp hoặc cấp dưới), để model không báo "từ chưa dạy" nhầm.
function taughtBefore(unitPath) {
  const [lv, name] = unitOrder(unitPath);
  const words = new Set();
  for (const level of fs.readdirSync(CONTENT_DIR)) {
    for (const f of fs.readdirSync(path.join(CONTENT_DIR, level))) {
      const u = `${level}/${f.replace(/\.json$/, "")}`;
      const [ulv, uname] = unitOrder(u);
      if (!f.endsWith(".json") || !(ulv < lv || (ulv === lv && uname < name))) continue;
      const d = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, `${u}.json`), "utf8"));
      for (const l of d.lessons) for (const w of l.words) [w.lemma, ...(w.forms ?? [])].forEach((x) => words.add(x));
    }
  }
  return [...words];
}

async function review(key, unitPath) {
  const [level] = unitPath.split("/");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, `${unitPath}.json`), "utf8");
  const before = taughtBefore(unitPath);
  const known = before.length
    ? `Các từ sau đã được dạy ở chủ đề trước, người học đã biết, được dùng trong câu mà không cần dạy lại: ${before.join(", ")}\n`
    : "Đây là chủ đề đầu tiên.\n";
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      {
        role: "user",
        parts: [{ text: `Cấp độ: ${LEVEL_NOTES[level] ?? level}\n${known}Chủ đề sau, dạng JSON:\n\n${raw}` }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new Error(`${unitPath}: model không trả lời (${data.candidates?.[0]?.finishReason ?? "?"})`);
      return { issues: JSON.parse(text).issues, usage: data.usageMetadata };
    }
    const msg = await res.text();
    if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    throw new Error(`${unitPath}: HTTP ${res.status} ${msg.slice(0, 300)}`);
  }
}

const key = readKey();
const units = listUnits();
if (!units.length) throw new Error(`Không thấy chủ đề nào khớp: ${targets.join(" ")}`);
let totals = { error: 0, suggestion: 0 };
for (const unit of units) {
  process.stdout.write(`${unit} ... `);
  const { issues, usage } = await review(key, unit);
  const out = path.join(REVIEW_DIR, `${unit}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const report = { unit, model: MODEL, checked_at: new Date().toISOString(), issues };
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  const e = issues.filter((i) => i.severity === "error").length;
  totals.error += e;
  totals.suggestion += issues.length - e;
  console.log(`${e} lỗi, ${issues.length - e} gợi ý (token: ${usage?.promptTokenCount ?? "?"} vào, ${usage?.candidatesTokenCount ?? "?"} ra)`);
}
console.log(`Tổng: ${totals.error} lỗi, ${totals.suggestion} gợi ý. Báo cáo ở tools/content/review/`);
