import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

/** Hỏi Supabase xem đăng nhập Google đã được bật chưa, để chỉ hiện nút khi dùng được. */
async function isGoogleEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, next: { revalidate: 60 } });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations("app");
  const [{ error }, googleEnabled] = await Promise.all([searchParams, isGoogleEnabled()]);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-3xl font-bold text-brand">{t("name")}</p>
        <p className="mt-1 text-sm text-muted">{t("tagline")}</p>
      </div>
      <LoginForm confirmFailed={error === "confirm" || error === "oauth"} googleEnabled={googleEnabled} />
    </main>
  );
}
