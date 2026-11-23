import { getRequestConfig } from "next-intl/server";

export const UI_LOCALES = ["vi"] as const;
export const DEFAULT_UI_LOCALE = "vi";

// Hiện chỉ có giao diện tiếng Việt. Khi thêm ngôn ngữ giao diện: thêm file messages/<mã>.json,
// thêm mã vào UI_LOCALES và đọc profiles.ui_locale tại đây.
export default getRequestConfig(async () => {
  const locale = DEFAULT_UI_LOCALE;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Ho_Chi_Minh",
  };
});
