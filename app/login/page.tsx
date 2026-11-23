import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations("app");
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-3xl font-bold text-brand">{t("name")}</p>
        <p className="mt-1 text-sm text-muted">{t("tagline")}</p>
      </div>
      <LoginForm confirmFailed={error === "confirm"} />
    </main>
  );
}
