import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { completeOnboarding } from "@/app/actions";
import { getProfile } from "@/lib/data";
import { TimezoneField } from "./TimezoneField";

const GOALS = [3, 4, 6, 8];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, user, profile } = await getProfile();
  const { data: enrollment } = await supabase.from("enrollments").select("course_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (enrollment) redirect("/");

  const t = await getTranslations("onboarding");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </div>

      {error === "no-course" && (
        <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn-text">
          {t("noCourse")}
        </p>
      )}

      <form action={completeOnboarding} className="card flex flex-col gap-4">
        <TimezoneField />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">{t("goalLabel")}</legend>
          {GOALS.map((goal) => (
            <label
              key={goal}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input type="radio" name="dailyGoal" value={goal} defaultChecked={goal === profile.daily_goal || (goal === 4 && !GOALS.includes(profile.daily_goal))} className="accent-brand" />
              {t("goalOption", { count: goal, minutes: goal * 3 })}
            </label>
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary">
          {t("start")}
        </button>
      </form>
    </main>
  );
}
