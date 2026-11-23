import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/** Lấy người đang đăng nhập; chưa đăng nhập thì chuyển về trang đăng nhập. Gọi ở mọi trang và server action. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}
