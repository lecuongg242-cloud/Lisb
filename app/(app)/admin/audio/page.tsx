import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAdmin, loadAudioUnits, type AudioUnit } from "@/lib/admin";
import { recordedVoices } from "@/lib/audio/speak";
import { AudioReviewList } from "./AudioReviewList";

type UnitWithVoices = AudioUnit & { voices: { dir: string; label: string }[] };

// Quản trị nghe duyệt từng file giọng đọc: mỗi chủ đề một trang, mỗi đoạn văn bản hai giọng.
export default async function AdminAudioPage({ searchParams }: { searchParams: Promise<{ unit?: string }> }) {
  const admin = await getAdmin();
  const t = await getTranslations();
  if (!admin) return null;
  const { unit: requestedUnit } = await searchParams;

  const { data: courses, error } = await admin.supabase.from("courses").select("id, target_lang").order("created_at");
  if (error) throw new Error(error.message);

  const units: UnitWithVoices[] = [];
  for (const course of courses ?? []) {
    const voices = recordedVoices(course.target_lang as string).map((voice) => ({
      dir: voice.dir,
      label: t(voice.choice === "female" ? "settings.voiceFemale" : "settings.voiceMale"),
    }));
    // Khóa chưa có giọng sinh sẵn thì không có gì để nghe duyệt.
    if (!voices.length) continue;
    for (const unit of await loadAudioUnits(admin.supabase, course.id as string, course.target_lang as string, "vi")) units.push({ ...unit, voices });
  }

  const countsOf = (unit: UnitWithVoices) => {
    let reviewed = 0;
    let bad = 0;
    for (const item of unit.items) {
      for (const voice of unit.voices) {
        const mark = item.verdicts[voice.dir];
        if (mark) reviewed++;
        if (mark?.verdict === "bad") bad++;
      }
    }
    return { reviewed, bad, total: unit.items.length * unit.voices.length };
  };
  const totals = units.map(countsOf).reduce((sum, c) => ({ reviewed: sum.reviewed + c.reviewed, bad: sum.bad + c.bad, total: sum.total + c.total }), {
    reviewed: 0,
    bad: 0,
    total: 0,
  });
  // Mặc định mở chủ đề đầu tiên còn file chưa duyệt.
  const selected = units.find((u) => u.id === requestedUnit) ?? units.find((u) => countsOf(u).reviewed < countsOf(u).total) ?? units[0];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.audio.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("admin.audio.intro")}</p>
        {units.length > 0 && <p className="mt-2 text-sm font-semibold">{t("admin.audio.progress", totals)}</p>}
      </div>

      {units.length === 0 ? (
        <p className="card text-muted">{t("admin.audio.noUnits")}</p>
      ) : (
        <>
          <nav aria-label={t("admin.audio.unitsLabel")} className="flex gap-2 overflow-x-auto pb-1">
            {units.map((unit, index) => {
              const counts = countsOf(unit);
              const active = unit.id === selected.id;
              return (
                <Link
                  key={unit.id}
                  href={`/admin/audio?unit=${unit.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-w-44 shrink-0 flex-col rounded-2xl border p-3 text-sm ${active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
                >
                  <span className="text-xs font-bold tracking-widest text-muted uppercase">{t("course.unitLabel", { number: index + 1 })}</span>
                  <span className="truncate font-semibold">{unit.title}</span>
                  <span className={counts.bad ? "text-bad-text" : "text-muted"}>
                    {counts.reviewed}/{counts.total}
                    {counts.bad > 0 && ` · ${t("admin.audio.badCount", { count: counts.bad })}`}
                  </span>
                </Link>
              );
            })}
          </nav>
          {/* key: đổi chủ đề thì dựng lại danh sách với trạng thái của chủ đề đó. */}
          <AudioReviewList key={selected.id} items={selected.items} voices={selected.voices} />
        </>
      )}
    </div>
  );
}
