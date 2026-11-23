import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Section = { heading: string; items: string[] };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t("privacy.title")} · ${t("app.name")}` };
}

// Trang công khai (không cần đăng nhập). Google yêu cầu trang này để cho phép đăng nhập bằng Google.
export default async function PrivacyPage() {
  const t = await getTranslations();
  const sections = t.raw("privacy.sections") as Section[];
  const email = t("privacy.contactEmail");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/login" className="text-xl font-bold text-brand">
          {t("app.name")}
        </Link>
        <h1 className="text-2xl font-bold">{t("privacy.title")}</h1>
        <p className="text-sm text-muted">{t("privacy.updated")}</p>
        <p>{t("privacy.intro")}</p>
      </header>

      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("privacy.contactHeading")}</h2>
        <p>
          {t("privacy.contactText")}{" "}
          <a href={`mailto:${email}`} className="font-medium text-brand-dark underline underline-offset-4">
            {email}
          </a>
        </p>
      </section>

      <Link href="/login" className="btn btn-secondary self-start">
        {t("privacy.back")}
      </Link>
    </main>
  );
}
