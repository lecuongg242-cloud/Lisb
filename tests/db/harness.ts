// Postgres chạy trong tiến trình (pglite) để kiểm thử migration, phân quyền và các hàm trong database
// trên dữ liệu giống thật: mọi migration trong scripts/ cộng nội dung bài học trong content/build/.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPTS_DIR = path.join(ROOT, "scripts");
const CONTENT_SQL = path.join(ROOT, "content", "build", "english-pre-a1.sql");

export type TestDb = {
  db: PGlite;
  /** Chạy fn dưới quyền một người dùng đã đăng nhập (RLS áp dụng). */
  asUser: <T>(userId: string, fn: () => Promise<T>) => Promise<T>;
  /** Chạy fn dưới quyền người chưa đăng nhập. */
  asAnon: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Chạy một câu lệnh và trả về các dòng. */
  rows: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  /** Tạo tài khoản; trả về id. */
  createUser: (options?: { admin?: boolean; enroll?: boolean }) => Promise<string>;
};

/** Khóa file âm thanh, cùng công thức với lib/audio/key.ts (không import được vì file đó chỉ chạy ở máy chủ). */
export const audioKey = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 20);

/** Các file migration theo thứ tự. `upTo` giới hạn tới một số thứ tự, để thử một migration trên dữ liệu có sẵn. */
export function migrationFiles(upTo?: string): string[] {
  return fs
    .readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !upTo || f.slice(0, 3) <= upTo);
}

export async function runMigration(db: PGlite, file: string): Promise<void> {
  await db.exec(`begin;\n${fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8")}\ncommit;`);
}

/** Dựng database: phần Supabase cung cấp sẵn (auth, role), mọi migration, nội dung bài học. */
export async function createTestDb(options: { migrateUpTo?: string } = {}): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  for (const file of migrationFiles(options.migrateUpTo)) await runMigration(db, file);
  await db.exec(`begin;\n${fs.readFileSync(CONTENT_SQL, "utf8")}\ncommit;`);

  const withRole = async <T>(role: string, userId: string, fn: () => Promise<T>): Promise<T> => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId}', false);`);
    try {
      return await fn();
    } finally {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
    }
  };

  const rows = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

  return {
    db,
    rows,
    asUser: (userId, fn) => withRole("authenticated", userId, fn),
    asAnon: (fn) => withRole("anon", "", fn),
    createUser: async ({ admin = false, enroll = true } = {}) => {
      const [{ id }] = await rows<{ id: string }>("insert into auth.users default values returning id");
      if (admin) await db.query("update public.profiles set role = 'admin' where id = $1", [id]);
      if (enroll) {
        await db.query(
          "insert into public.enrollments (user_id, course_id, source_lang) select $1, c.id, 'vi' from public.courses c where c.slug = 'english'",
          [id],
        );
      }
      return id;
    },
  };
}

/** Câu lệnh phải thất bại (bị từ chối quyền, vi phạm ràng buộc, hàm báo lỗi). Trả về thông báo lỗi. */
export async function expectRejected(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Câu lệnh đáng lẽ phải bị từ chối nhưng lại chạy được");
}
