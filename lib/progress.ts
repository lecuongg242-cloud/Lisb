/**
 * Trạng thái của một bài trên lộ trình.
 * - done: đã học xong mọi phiên của bài.
 * - current: bài đang học.
 * - available: đã mở nhưng chưa học xong (bài đứng trước bài đang học).
 * - locked: đứng sau bài đang học, chưa mở.
 */
export type LessonState = "done" | "current" | "available" | "locked";

/**
 * @param index vị trí của bài trên lộ trình
 * @param currentIndex vị trí của bài đang học; -1 nếu không còn bài đang học
 * @param completedSessions số phiên của bài đã hoàn thành
 * @param totalSessions tổng số phiên của bài
 */
export function lessonState(index: number, currentIndex: number, completedSessions: number, totalSessions: number): LessonState {
  if (totalSessions > 0 && completedSessions >= totalSessions) return "done";
  // Không còn bài đang học (đã học hết nội dung hiện có): mọi bài đều mở.
  if (currentIndex < 0) return "available";
  if (index === currentIndex) return "current";
  return index < currentIndex ? "available" : "locked";
}

/** Phiên kế tiếp cần học trong một bài: phiên đầu tiên chưa hoàn thành, theo thứ tự. */
export function nextSessionNo(sessionNos: number[], completed: ReadonlySet<number>): number | null {
  for (const no of [...sessionNos].sort((a, b) => a - b)) if (!completed.has(no)) return no;
  return null;
}
