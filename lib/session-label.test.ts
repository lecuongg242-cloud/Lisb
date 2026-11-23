import { describe, expect, it } from "vitest";
import { sessionLabels } from "./session-label";

const translate = {
  has: (key: string) => key !== "sessionKind.unknown",
  text: (key: string) => ({ "sessionKind.vocab_learn": "Học từ mới", "sessionKind.vocab_recall": "Nhớ lại từ", "session.vocab": "Từ vựng" })[key] ?? key,
};

describe("sessionLabels", () => {
  it("đánh số khi có nhiều phiên cùng kiểu, không đánh số khi chỉ có một", () => {
    const labels = sessionLabels(
      [
        { no: 1, kind: "vocab_learn", type: "vocab" },
        { no: 2, kind: "vocab_learn", type: "vocab" },
        { no: 3, kind: "vocab_recall", type: "vocab" },
      ],
      translate,
    );
    expect([...labels.entries()]).toEqual([
      [1, "Học từ mới 1"],
      [2, "Học từ mới 2"],
      [3, "Nhớ lại từ"],
    ]);
  });
  it("kiểu phiên chưa có tên thì dùng tên của loại kỹ năng", () => {
    expect(sessionLabels([{ no: 1, kind: "unknown", type: "vocab" }], translate).get(1)).toBe("Từ vựng");
  });
});
