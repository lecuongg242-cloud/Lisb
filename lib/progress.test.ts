import { describe, expect, it } from "vitest";
import { lessonState, nextSessionNo } from "./progress";

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
