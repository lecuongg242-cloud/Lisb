import { getTranslations } from "next-intl/server";
import { StatusScreen } from "@/components/StatusScreen";

// Đường dẫn không tồn tại, hoặc một trang ngoài khung điều hướng gọi notFound().
export default async function NotFound() {
  const t = await getTranslations("errors");
  return <StatusScreen code="404" title={t("notFoundTitle")} body={t("notFoundBody")} fullScreen actions={[{ label: t("home"), href: "/", primary: true }]} />;
}
