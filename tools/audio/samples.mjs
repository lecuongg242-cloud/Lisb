// Sinh các file mẫu để nghe và chọn giọng: node tools/audio/samples.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KokoroTTS } from "kokoro-js";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "audio-samples");
const VOICES = ["af_heart", "af_bella", "am_michael", "am_fenrir"];
const TEXTS = {
  "1-cau": "Nice to meet you. Where are you from?",
  "2-cau-ngan": "Good morning!",
  "3-tu": "hello",
  "4-chu-cai": "A, B, C.",
  "5-so": "Thirteen, fourteen, fifteen.",
  "6-cau-hoi": "Is this a cup or a pen?",
};

fs.mkdirSync(OUT, { recursive: true });
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
for (const voice of VOICES) {
  for (const [name, text] of Object.entries(TEXTS)) {
    const started = Date.now();
    const audio = await tts.generate(text, { voice });
    const file = path.join(OUT, `${voice}_${name}.wav`);
    await audio.save(file);
    console.log(`${voice} ${name}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB in ${Date.now() - started} ms`);
  }
}
console.log("Xong:", OUT);
