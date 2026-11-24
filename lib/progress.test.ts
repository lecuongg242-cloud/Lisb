import { describe, expect, it } from "vitest";
import { currentLessonIndex, lessonState, nextSessionNo } from "./progress";

describe("currentLessonIndex", () => {
  const path = [
    { id: "p1", levelCode: "pre-a1" },
    { id: "p2", levelCode: "pre-a1" },
    { id: "p3", levelCode: "pre-a1" },
    { id: "a1", levelCode: "a1" },
    { id: "a2", levelCode: "a1" },
  ];
  const none = new Set<string>();
  const doneOf = (...ids: string[]) => (id: string) => ids.includes(id);

  it("là bài được lưu khi bài đó chưa xong", () => {
    expect(currentLessonIndex(path, "p2", doneOf("p1"), none)).toBe(1);
  });
  it("bài được lưu đã xong thì chuyển sang bài chưa xong kế tiếp", () => {
    expect(currentLessonIndex(path, "p3", doneOf("p1", "p2", "p3"), none)).toBe(3);
  });
  it("không bỏ qua bài chưa xong đứng trước bài được lưu", () => {
    expect(currentLessonIndex(path, "p3", doneOf(), none)).toBe(2);
  });
  it("không tìm thấy bài được lưu thì bắt đầu từ đầu lộ trình", () => {
    expect(currentLessonIndex(path, null, doneOf("p1"), none)).toBe(1);
    expect(currentLessonIndex(path, "không-còn", doneOf(), none)).toBe(0);
  });
  it("đạt kiểm tra cuối cấp thì bài đang học nhảy sang cấp sau", () => {
    expect(currentLessonIndex(path, "p2", doneOf("p1"), new Set(["pre-a1"]))).toBe(3);
  });
  it("học hết mọi bài thì không còn bài đang học", () => {
    expect(currentLessonIndex(path, "a2", doneOf("p1", "p2", "p3", "a1", "a2"), none)).toBe(-1);
  });
});

describe("lessonState", () => {
  it("xong khi đã học đủ mọi phiên, bất kể vị trí", () => {
    expect(lessonState(5, 2, 4, 4)).toBe("done");
    expect(lessonState(0, -1, 5, 4)).toBe("done");
  });
  it("bài chưa có phiên nào thì không bao giờ là xong", () => {
    expect(lessonState(0, 0, 0, 0)).toBe("current");
  });
  it("bài đang học, bài đã mở, bài còn khóa", () => {
    expect(lessonState(2, 2, 1, 4)).toBe("current");
    expect(lessonState(1, 2, 0, 4)).toBe("available");
    expect(lessonState(3, 2, 0, 4)).toBe("locked");
  });
  it("hết bài đang học thì mọi bài chưa xong đều mở", () => {
    expect(lessonState(7, -1, 1, 4)).toBe("available");
  });
});

describe("nextSessionNo", () => {
  it("trả về phiên đầu tiên chưa học theo thứ tự", () => {
    expect(nextSessionNo([1, 2, 3, 4], new Set())).toBe(1);
    expect(nextSessionNo([3, 1, 2], new Set([1]))).toBe(2);
    expect(nextSessionNo([1, 2, 3], new Set([1, 3]))).toBe(2);
  });
  it("trả về null khi đã học hết hoặc bài không có phiên", () => {
    expect(nextSessionNo([1, 2], new Set([1, 2]))).toBeNull();
    expect(nextSessionNo([], new Set())).toBeNull();
  });
});
