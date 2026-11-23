import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/actions";
import { getProfile } from "@/lib/data";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { user, profile } = await getProfile();
  const t = await getTranslations("settings");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SettingsForm displayName={profile.display_name ?? ""} dailyGoal={profile.daily_goal} />
      <section className="card flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">{t("account")}</h2>
          <p className="text-sm break-all text-muted">{user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn btn-secondary w-full">
            {t("signOut")}
          </button>
        </form>
      </section>
    </div>
  );
}
