"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { audioKey } from "@/lib/audio/key";
import { isRecordedVoice } from "@/lib/audio/speak";

type AdminResult = { ok: true } | { ok: false; reason: "invalid" | "forbidden" | "error" };

// ---------- Báo lỗi nội dung ----------

const resolveSchema = z.object({ reportId: z.string().uuid(), status: z.enum(["open", "fixed", "rejected"]) });

/** Đóng một báo cáo (đã sửa hoặc không phải lỗi), hoặc mở lại. */
export async function resolveReportAction(input: z.infer<typeof resolveSchema>): Promise<AdminResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const admin = await getAdmin();
  if (!admin) return { ok: false, reason: "forbidden" };
  const closed = parsed.data.status !== "open";
  const { data, error } = await admin.supabase
    .from("content_reports")
    .update({ status: parsed.data.status, resolved_at: closed ? new Date().toISOString() : null, resolved_by: closed ? admin.user.id : null })
    .eq("id", parsed.data.reportId)
    .select("id");
  // Mở lại có thể đụng báo cáo trùng đang mở của cùng người; khi đó giữ nguyên.
  if (error || !data?.length) return { ok: false, reason: "error" };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ---------- Nghe duyệt âm thanh ----------

const verdictSchema = z.object({
  voice: z.string().max(40),
  text: z.string().min(1).max(500),
  /** null = bỏ đánh dấu, file trở về trạng thái chưa duyệt. */
  verdict: z.enum(["ok", "bad"]).nullable(),
  note: z.string().trim().max(300),
});

export async function setAudioVerdictAction(input: z.infer<typeof verdictSchema>): Promise<AdminResult> {
  const parsed = verdictSchema.safeParse(input);
  if (!parsed.success || !isRecordedVoice(parsed.data.voice)) return { ok: false, reason: "invalid" };
  const admin = await getAdmin();
  if (!admin) return { ok: false, reason: "forbidden" };
  const { voice, text, verdict, note } = parsed.data;
  // Khóa luôn được tính lại từ văn bản ở máy chủ, nên một dòng không thể trỏ nhầm file.
  const key = audioKey(text);

  const { error } = verdict
    ? await admin.supabase.from("audio_reviews").upsert(
        { audio_key: key, voice, text, verdict, note: verdict === "bad" && note ? note : null, reviewed_by: admin.user.id, reviewed_at: new Date().toISOString() },
        { onConflict: "audio_key,voice" },
      )
    : await admin.supabase.from("audio_reviews").delete().eq("audio_key", key).eq("voice", voice);
  return error ? { ok: false, reason: "error" } : { ok: true };
}
