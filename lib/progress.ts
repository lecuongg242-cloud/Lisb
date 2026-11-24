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

/**
 * Vị trí của bài đang học trên lộ trình (chỉ gồm bài đã xuất bản, theo thứ tự học); -1 nếu không còn bài nào phải học.
 *
 * Bắt đầu từ bài được lưu trong ghi danh (hoặc bài đầu tiên nếu không tìm thấy), rồi bỏ qua:
 * - bài đã học xong: nhờ vậy khi có bài mới được xuất bản sau bài cuối đã học, bài mới trở thành bài đang học;
 * - bài thuộc cấp mà người học đã đạt bài kiểm tra cuối cấp: đạt kiểm tra là được mở cấp sau.
 * Các bài bị bỏ qua vẫn mở để học lại, vì chúng đứng trước bài đang học.
 */
export function currentLessonIndex(
  lessons: readonly { id: string; levelCode: string }[],
  storedLessonId: string | null,
  isDone: (lessonId: string) => boolean,
  passedLevels: ReadonlySet<string>,
): number {
  let i = Math.max(0, lessons.findIndex((l) => l.id === storedLessonId));
  while (i < lessons.length && (isDone(lessons[i].id) || passedLevels.has(lessons[i].levelCode))) i++;
  return i < lessons.length ? i : -1;
}

/** Phiên kế tiếp cần học trong một bài: phiên đầu tiên chưa hoàn thành, theo thứ tự. */
export function nextSessionNo(sessionNos: number[], completed: ReadonlySet<number>): number | null {
  for (const no of [...sessionNos].sort((a, b) => a - b)) if (!completed.has(no)) return no;
  return null;
}
