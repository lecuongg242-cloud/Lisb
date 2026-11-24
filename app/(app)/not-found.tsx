import { getTranslations } from "next-intl/server";
import { StatusScreen } from "@/components/StatusScreen";

// Một trang trong app gọi notFound() (bài học không tồn tại hoặc chưa mở): giữ thanh điều hướng.
export default async function AppNotFound() {
  const t = await getTranslations("errors");
  return (
    <StatusScreen
      code="404"
      title={t("notFoundTitle")}
      body={t("notFoundBody")}
      actions={[
        { label: t("course"), href: "/course", primary: true },
        { label: t("home"), href: "/" },
      ]}
    />
  );
}
