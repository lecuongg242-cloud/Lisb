import { SESSION_TYPES } from "./exercises/types";

/**
 * Trạng thái của một bài trên lộ trình.
 * - done: đã học xong mọi phiên của bài.
 * - current: bài đang học.
 * - available: đã mở nhưng chưa học xong (bài đứng trước bài đang học).
 * - locked: đứng sau bài đang học, chưa mở.
 */
export type LessonState = "done" | "current" | "available" | "locked";

export function lessonState(index: number, currentIndex: number, completedTypes: ReadonlySet<string> | undefined): LessonState {
  if (completedTypes && SESSION_TYPES.every((type) => completedTypes.has(type))) return "done";
  // Không còn bài đang học (đã học hết nội dung hiện có): mọi bài đều mở.
  if (currentIndex < 0) return "available";
  if (index === currentIndex) return "current";
  return index < currentIndex ? "available" : "locked";
}
