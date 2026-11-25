// Chạy SQL trên database theo DATABASE_URL trong .env.local.
//
//   npm run sql -- scripts/015-x.sql content/build/english-a1.sql   mỗi file một transaction, dừng ở file lỗi đầu tiên
//   npm run sql -- -c "select count(*) from public.lessons"          chạy một câu lệnh và in kết quả
//   npm run sql -- --dry-run scripts/015-x.sql -c "select ..."       chạy các file rồi câu lệnh kiểm tra trong một
//                                                                    transaction, in kết quả rồi hủy, không ghi gì
//
// Không in chuỗi kết nối ra màn hình.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(ROOT, ".env.local");
  if (fs.existsSync(envFile)) {
    const line = fs.readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("Thiếu DATABASE_URL (đặt trong .env.local).");
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Dùng: npm run sql -- <file.sql> [...]  hoặc  npm run sql -- -c "<câu lệnh>"');
  process.exit(2);
}

const sql = postgres(databaseUrl(), { onnotice: (n) => console.log(`NOTICE: ${n.message}`), max: 1, prepare: false });

const ROLLBACK = Symbol("rollback");

try {
  if (args[0] === "--dry-run") {
    const c = args.indexOf("-c");
    const files = args.slice(1, c < 0 ? undefined : c);
    const check = c < 0 ? null : args.slice(c + 1).join(" ");
    await sql
      .begin(async (tx) => {
        for (const file of files) {
          await tx.unsafe(fs.readFileSync(path.resolve(file), "utf8"));
          console.log(`OK  ${file} (chạy thử)`);
        }
        if (check) {
          const rows = await tx.unsafe(check);
          if (rows.length) console.table(rows);
        }
        throw ROLLBACK;
      })
      .catch((e) => {
        if (e !== ROLLBACK) throw e;
        console.log("Đã hủy transaction, database không đổi.");
      });
  } else if (args[0] === "-c") {
    const rows = await sql.unsafe(args.slice(1).join(" "));
    if (rows.length) console.table(rows);
    else console.log(`${rows.command ?? "OK"} ${rows.count ?? ""}`.trim());
  } else {
    for (const file of args) {
      const text = fs.readFileSync(path.resolve(file), "utf8");
      await sql.begin((tx) => tx.unsafe(text));
      console.log(`OK  ${file}`);
    }
  }
} catch (e) {
  console.error(`Lỗi: ${e.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
