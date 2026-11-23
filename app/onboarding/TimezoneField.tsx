"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Gửi kèm múi giờ của trình duyệt để máy chủ tính đúng "hôm nay" cho chuỗi ngày học. */
export function TimezoneField() {
  const timezone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
  return <input type="hidden" name="timezone" value={timezone} />;
}
