// Chế độ sáng/tối. Là tùy chọn của riêng từng thiết bị nên lưu trên trình duyệt.
// "system" = theo cài đặt của thiết bị (không đặt data-theme); "light"/"dark" = ép theo lựa chọn.

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "lisb.theme";
const listeners = new Set<() => void>();

/**
 * Đoạn mã chạy trước khi trang hiện ra (đặt trong <head>) để áp dụng lựa chọn đã lưu,
 * tránh nháy màu sáng rồi mới chuyển sang tối.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function getThemeChoice(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Không lưu được (chế độ riêng tư): vẫn áp dụng cho lần mở này.
  }
  if (choice === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  for (const listener of listeners) listener();
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
