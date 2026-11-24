import fs from "node:fs";
import path from "node:path";

type Messages = Record<string, Record<string, string>>;

/** Chuỗi giao diện đọc từ file dịch, để kiểm thử không chép lại câu chữ. */
export const vi = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "..", "messages", "vi.json"), "utf8")) as Messages;

/** Tài khoản thử lấy từ .env.local; thiếu thì báo rõ cách cấu hình. */
export function testAccount(): { email: string; password: string } {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("Thiếu E2E_EMAIL hoặc E2E_PASSWORD trong .env.local (xem .env.example).");
  return { email, password };
}
