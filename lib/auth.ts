import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type SessionUser = { id: string; email: string | null };

/**
 * Lấy người đang đăng nhập; chưa đăng nhập thì chuyển về trang đăng nhập. Gọi ở mọi trang và server action.
 *
 * - cache(): layout và trang cùng gọi trong một request thì chỉ kiểm tra một lần.
 * - getClaims(): kiểm tra chữ ký của token ngay tại máy chủ (khóa công khai được giữ sẵn trong bộ nhớ),
 *   không phải gọi sang dịch vụ đăng nhập ở mỗi request như getUser().
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login");
  const user: SessionUser = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
  return { supabase, user };
});
