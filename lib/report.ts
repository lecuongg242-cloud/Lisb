// Báo lỗi nội dung: mã lý do dùng chung giữa nút báo lỗi, server action và trang quản trị.
// Tên hiển thị nằm ở messages (report.reason.*).

export const REPORT_REASONS = ["meaning", "audio", "text", "grading", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
