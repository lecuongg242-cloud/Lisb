import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// TRANG CHẨN ĐOÁN TẠM THỜI: cho biết phiên đăng nhập hiện tại đọc được gì từ database.
// Không trả về khóa hay dữ liệu nhạy cảm. Xóa file này sau khi tìm ra lỗi ghi danh.
export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ signedIn: false, authError: authError?.message ?? null });

  const profile = await supabase.from("profiles").select("id, role, daily_goal").eq("id", user.id).maybeSingle();
  const plain = await supabase.from("enrollments").select("course_id, is_active, current_lesson_id").eq("user_id", user.id);
  const all = await supabase.from("enrollments").select("user_id, is_active");
  const embedded = await supabase
    .from("enrollments")
    .select("course_id, source_lang, current_lesson_id, courses(id, target_lang, languages!courses_target_lang_fkey(tts_locale))")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return NextResponse.json(
    {
      signedIn: true,
      userId: user.id,
      provider: user.app_metadata?.provider ?? null,
      profile: { found: !!profile.data, role: profile.data?.role ?? null, dailyGoal: profile.data?.daily_goal ?? null, error: profile.error?.message ?? null },
      enrollmentsForUser: { rows: plain.data ?? null, error: plain.error?.message ?? null },
      enrollmentsVisible: { rows: all.data ?? null, error: all.error?.message ?? null },
      homeQuery: { found: !!embedded.data, data: embedded.data ?? null, error: embedded.error?.message ?? null },
      serverTime: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
