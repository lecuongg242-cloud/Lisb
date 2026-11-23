"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: "invalid" | "signupFailed" | null; notice: "checkEmail" | null };

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalid", notice: null };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "invalid", notice: null };
  redirect("/");
}

export async function signUp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "signupFailed", notice: null };
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) return { error: "signupFailed", notice: null };
  // Nếu project tắt xác nhận email thì đã có phiên ngay; nếu bật thì chờ người dùng bấm đường dẫn trong email.
  if (data.session) redirect("/");
  return { error: null, notice: "checkEmail" };
}
