import { describe, expect, it } from "vitest";
import { en } from "./en";

describe("tokenize", () => {
  it("bỏ dấu câu, giữ dấu nháy trong từ", () => {
    expect(en.tokenize("I'm fine, thank you.")).toEqual(["I'm", "fine", "thank", "you"]);
    expect(en.tokenize("Really? I’m from Vietnam, too.")).toEqual(["Really", "I'm", "from", "Vietnam", "too"]);
  });
});

describe("normalize", () => {
  it("không phân biệt hoa thường, dấu câu, khoảng trắng thừa", () => {
    expect(en.normalize("  Hello!  ")).toBe("hello");
    expect(en.normalize("How   are YOU?")).toBe("how are you");
  });
});

describe("checkAnswer", () => {
  it("đúng khi chỉ khác hoa thường và dấu câu", () => {
    expect(en.checkAnswer("how are you", "How are you?")).toBe("correct");
  });
  it("đúng khi khớp một cách viết được chấp nhận", () => {
    expect(en.checkAnswer("I am fine, thank you", "I'm fine, thank you.", ["I am fine, thank you."])).toBe("correct");
  });
  it("gần đúng khi sai một ký tự ở từ dài", () => {
    expect(en.checkAnswer("Good mornin", "Good morning!")).toBe("almost");
    expect(en.checkAnswer("goodbey", "Goodbye!")).toBe("wrong"); // đảo 2 ký tự = khoảng cách 2
    expect(en.checkAnswer("goodbyee", "Goodbye!")).toBe("almost");
  });
  it("sai khi lỗi nằm ở từ ngắn, vì dễ thành từ khác", () => {
    expect(en.checkAnswer("Hi", "Bye!")).toBe("wrong");
    expect(en.checkAnswer("I'm fin", "I'm fine")).toBe("wrong");
  });
  it("sai khi thiếu từ hoặc để trống", () => {
    expect(en.checkAnswer("How are", "How are you?")).toBe("wrong");
    expect(en.checkAnswer("   ", "Hello!")).toBe("wrong");
  });
});

describe("diffWords", () => {
  it("đánh dấu từ thiếu và từ thừa", () => {
    expect(en.diffWords("See you later!", "see you")).toEqual([
      { word: "See", status: "ok" },
      { word: "you", status: "ok" },
      { word: "later", status: "missing" },
    ]);
    const diff = en.diffWords("Nice to meet you.", "Nice too meet you");
    expect(diff.filter((d) => d.status === "ok").map((d) => d.word)).toEqual(["Nice", "meet", "you"]);
    expect(diff.find((d) => d.status === "missing")?.word).toBe("to");
    expect(diff.find((d) => d.status === "extra")?.word).toBe("too");
  });
});
