"use client";

import { useFormStatus } from "react-dom";

/** Nút gửi form có trạng thái đang xử lý, để người dùng biết lần bấm đã được nhận. */
export function StartButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
