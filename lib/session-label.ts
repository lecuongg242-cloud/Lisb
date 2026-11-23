/**
 * Tên hiển thị của từng phiên trong một bài.
 * Khi một bài có nhiều phiên cùng kiểu (ví dụ hai phiên học từ mới) thì thêm số thứ tự: "Học từ mới 1", "Học từ mới 2".
 */
export function sessionLabels(
  sessions: { no: number; kind: string; type: string }[],
  translate: { has: (key: string) => boolean; text: (key: string) => string },
): Map<number, string> {
  const base = (s: { kind: string; type: string }) =>
    translate.has(`sessionKind.${s.kind}`) ? translate.text(`sessionKind.${s.kind}`) : translate.text(`session.${s.type}`);
  const total = new Map<string, number>();
  for (const s of sessions) total.set(s.kind, (total.get(s.kind) ?? 0) + 1);

  const seen = new Map<string, number>();
  const labels = new Map<number, string>();
  for (const s of [...sessions].sort((a, b) => a.no - b.no)) {
    const ordinal = (seen.get(s.kind) ?? 0) + 1;
    seen.set(s.kind, ordinal);
    labels.set(s.no, (total.get(s.kind) ?? 0) > 1 ? `${base(s)} ${ordinal}` : base(s));
  }
  return labels;
}
