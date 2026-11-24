import { beforeAll, describe, expect, it } from "vitest";
import { en } from "../../lib/lang/en";
import { generateLevelTestPool, LEVEL_TEST_PASS_PERCENT, LEVEL_TEST_QUESTION_COUNT, type PoolSentence, type PoolWord } from "../../lib/level-test/pool";
import { audioKey, createTestDb, expectRejected, type TestDb } from "./harness";

type Question = {
  id: string;
  type: "choose_word" | "type_word" | "listen_choose" | "listen_type";
  prompt_target: string | null;
  prompt_source: string | null;
  audio_key: string | null;
  options: { id: string; label: string }[] | null;
};
type StartResult = { attempt_id: string; pass_percent: number; questions: Question[] };
type SubmitResult = { correct: number; total: number; percent: number; passed: boolean; pass_percent: number; details: { question_id: string; is_correct: boolean; correct_answer: string }[] };

let t: TestDb;
let levelId: string;
let admin: string;
let learner: string;
let other: string;
/** Đáp án đúng theo id câu hỏi, đọc bằng quyền quản trị: thứ mà người học không bao giờ thấy. */
let answerKey: Map<string, { choice: string; text: string; unitId: string }>;

const start = (userId: string) =>
  t.asUser(userId, async () => (await t.rows<{ r: StartResult }>("select public.start_level_test($1) as r", [levelId]))[0].r);
const submit = (userId: string, attemptId: string, answers: Record<string, string>) =>
  t.asUser(userId, async () => (await t.rows<{ r: SubmitResult }>("select public.submit_level_test($1, $2::jsonb) as r", [attemptId, JSON.stringify(answers)]))[0].r);

/** Câu trả lời đúng cho một câu hỏi: id lựa chọn với câu chọn, chữ với câu gõ. */
const rightAnswer = (q: Question) => (q.options ? answerKey.get(q.id)!.choice : answerKey.get(q.id)!.text);
const wrongAnswer = (q: Question) => (q.options ? q.options.find((o) => o.id !== answerKey.get(q.id)!.choice)!.id : "zzz wrong");
/** Trả lời đúng `correctCount` câu đầu, sai các câu còn lại. */
const answersWith = (questions: Question[], correctCount: number) =>
  Object.fromEntries(questions.map((q, i) => [q.id, i < correctCount ? rightAnswer(q) : wrongAnswer(q)]));

beforeAll(async () => {
  t = await createTestDb();
  admin = await t.createUser({ admin: true });
  learner = await t.createUser();
  other = await t.createUser();
  levelId = (await t.rows<{ id: string }>("select id from public.levels where code = 'pre-a1'"))[0].id;

  // Ngân hàng câu hỏi sinh từ đúng nội dung thật của cấp, bằng đúng hàm mà ứng dụng dùng.
  const words = await t.rows<PoolWord & { meanings: string[] }>(
    `select w.id, w.lemma, w.part_of_speech as pos, l.unit_id as "unitId",
            array(select wt.meaning from public.word_translations wt where wt.word_id = w.id and wt.locale = 'vi') as meanings
     from public.lesson_words lw join public.words w on w.id = lw.word_id join public.lessons l on l.id = lw.lesson_id`,
  );
  const sentenceRows = await t.rows<{ id: string; text: string; unitId: string }>(
    `select s.id, s.text, l.unit_id as "unitId" from public.sentences s join public.lessons l on l.id = s.lesson_id`,
  );
  const sentences: PoolSentence[] = sentenceRows.map((s) => ({ ...s, tokens: en.tokenize(s.text), audioKey: audioKey(s.text) }));
  const pool = generateLevelTestPool({ words, sentences, seed: levelId });

  const published = await t.asUser(admin, () =>
    t.rows<{ n: number }>("select public.publish_level_test($1, $2, $3, $4::jsonb) as n", [
      levelId,
      LEVEL_TEST_QUESTION_COUNT,
      LEVEL_TEST_PASS_PERCENT,
      JSON.stringify(pool),
    ]),
  );
  expect(Number(published[0].n)).toBe(pool.length);

  const keys = await t.rows<{ id: string; choice: string; text: string; unit_id: string }>(
    `select q.id, coalesce(q.payload ->> 'word_id', q.payload ->> 'sentence_id') as choice, coalesce(w.lemma, s.text) as text, q.unit_id
     from public.level_test_questions q
     left join public.words w on w.id = (q.payload ->> 'word_id')::uuid
     left join public.sentences s on s.id = (q.payload ->> 'sentence_id')::uuid`,
  );
  answerKey = new Map(keys.map((k) => [k.id, { choice: k.choice, text: k.text, unitId: k.unit_id }]));
}, 120_000);

describe("normalize_answer khớp với cách chuẩn hóa trong ứng dụng", () => {
  it("cho cùng kết quả với lib/lang/en.ts trên mọi câu, mọi từ và các biến thể gõ thường gặp", async () => {
    const texts = (
      await t.rows<{ v: string }>(
        `select text as v from public.sentences
         union select unnest(accepted_forms) from public.sentences
         union select lemma from public.words`,
      )
    ).map((r) => r.v);
    const variants = texts.flatMap((v) => [v, v.toUpperCase(), `  ${v}  `, v.replace(/'/g, "’"), v.replace(/[.!?]$/, ""), `"${v}"`, v.replace(/ /g, "   ")]);
    const extras = ["", "   ", "?!", "'", "I'm  fine , thank you .", "don't", "'hello'", "A, B, C.", "13, 14, 15."];
    const samples = [...new Set([...variants, ...extras])];

    const result = await t.rows<{ v: string; n: string }>(
      "select v, public.normalize_answer(v, 'en') as n from unnest($1::text[]) as x (v)",
      [samples],
    );
    const mismatches = result.filter((r) => r.n !== en.normalize(r.v)).map((r) => ({ input: r.v, sql: r.n, app: en.normalize(r.v) }));
    expect(mismatches).toEqual([]);
    expect(result.length).toBeGreaterThan(1000);
  });
});

describe("phân quyền", () => {
  it("người học không đọc được ngân hàng câu hỏi và không tự nạp được đề", async () => {
    await t.asUser(learner, async () => {
      expect(await t.rows("select id from public.level_test_questions")).toHaveLength(0);
      expect(await expectRejected(() => t.rows("select public.publish_level_test($1, 20, 80, '[]'::jsonb)", [levelId]))).toContain("forbidden");
    });
  });

  it("người học không tự ghi hay sửa kết quả được", async () => {
    const attempt = await start(learner);
    await t.asUser(learner, async () => {
      await expectRejected(() =>
        t.rows("insert into public.level_test_attempts (user_id, level_id, pass_percent, question_ids, status, passed, percent) values ($1, $2, 80, '{}', 'submitted', true, 100)", [
          learner,
          levelId,
        ]),
      );
      await t.db.query("update public.level_test_attempts set passed = true, percent = 100, status = 'submitted' where id = $1", [attempt.attempt_id]);
    });
    const [row] = await t.rows<{ status: string; passed: boolean | null }>("select status, passed from public.level_test_attempts where id = $1", [attempt.attempt_id]);
    expect(row).toEqual({ status: "started", passed: null });
  });

  it("người học chỉ thấy lượt làm bài của mình", async () => {
    await start(other);
    await t.asUser(learner, async () => {
      const owners = await t.rows<{ user_id: string }>("select distinct user_id from public.level_test_attempts");
      expect(owners.map((o) => o.user_id)).toEqual([learner]);
    });
  });

  it("chưa đăng nhập hoặc chưa ghi danh thì không bắt đầu được", async () => {
    await t.asAnon(async () => {
      await expectRejected(() => t.rows("select public.start_level_test($1)", [levelId]));
    });
    const outsider = await t.createUser({ enroll: false });
    expect(await expectRejected(() => start(outsider))).toContain("not enrolled");
  });
});

describe("start_level_test", () => {
  it("trả về 20 câu, mỗi loại 5 câu, theo thứ tự từ vựng rồi nghe", async () => {
    const { questions, pass_percent } = await start(learner);
    expect(pass_percent).toBe(80);
    expect(questions).toHaveLength(20);
    expect(questions.map((q) => q.type)).toEqual([
      ...Array(5).fill("choose_word"),
      ...Array(5).fill("type_word"),
      ...Array(5).fill("listen_choose"),
      ...Array(5).fill("listen_type"),
    ]);
    expect(new Set(questions.map((q) => q.id)).size).toBe(20);
  });

  it("đề bài đủ để hiển thị nhưng không chứa đáp án", async () => {
    const { questions } = await start(learner);
    for (const q of questions) {
      expect(Object.keys(q).sort()).toEqual(["audio_key", "id", "options", "prompt_source", "prompt_target", "type"]);
      if (q.type === "choose_word" || q.type === "type_word") {
        expect(q.prompt_source).toBeTruthy();
        expect(q.prompt_target).toBeTruthy();
        expect(q.audio_key).toBeNull();
      } else {
        expect(q.audio_key).toMatch(/^[0-9a-f]{20}$/);
        expect(q.prompt_source).toBeNull();
      }
      if (q.type === "choose_word" || q.type === "listen_choose") {
        expect(q.options!.length).toBeGreaterThanOrEqual(2);
        expect(q.options!.map((o) => o.id)).toContain(answerKey.get(q.id)!.choice);
        expect(q.options!.every((o) => o.label.length > 0)).toBe(true);
      } else {
        expect(q.options).toBeNull();
      }
    }
  });

  it("mỗi loại câu hỏi lấy từ 5 chủ đề khác nhau", async () => {
    const { questions } = await start(learner);
    for (const type of ["choose_word", "type_word", "listen_choose", "listen_type"]) {
      const units = questions.filter((q) => q.type === type).map((q) => answerKey.get(q.id)!.unitId);
      expect(new Set(units).size).toBe(5);
    }
  });

  it("mỗi lượt làm ra một bộ câu hỏi khác", async () => {
    const first = (await start(learner)).questions.map((q) => q.id).join();
    const sets = new Set([first]);
    for (let i = 0; i < 3; i++) sets.add((await start(learner)).questions.map((q) => q.id).join());
    expect(sets.size).toBeGreaterThan(1);
  });
});

describe("submit_level_test", () => {
  it("đúng hết thì đạt 100% và được ghi là đã qua", async () => {
    const { attempt_id, questions } = await start(learner);
    const result = await submit(learner, attempt_id, answersWith(questions, 20));
    expect(result).toMatchObject({ correct: 20, total: 20, percent: 100, passed: true, pass_percent: 80 });
    expect(result.details.every((d) => d.is_correct)).toBe(true);
    const [row] = await t.rows("select status, passed, percent, correct_count, total_count from public.level_test_attempts where id = $1", [attempt_id]);
    expect(row).toEqual({ status: "submitted", passed: true, percent: 100, correct_count: 20, total_count: 20 });
  });

  it("đúng 16/20 là vừa đủ 80%; đúng 15/20 thì không đạt", async () => {
    const a = await start(learner);
    expect(await submit(learner, a.attempt_id, answersWith(a.questions, 16))).toMatchObject({ correct: 16, percent: 80, passed: true });
    const b = await start(learner);
    expect(await submit(learner, b.attempt_id, answersWith(b.questions, 15))).toMatchObject({ correct: 15, percent: 75, passed: false });
  });

  it("câu bỏ trống tính là sai; kết quả trả về đáp án đúng của từng câu theo đúng thứ tự", async () => {
    const { attempt_id, questions } = await start(learner);
    const result = await submit(learner, attempt_id, {});
    expect(result).toMatchObject({ correct: 0, total: 20, percent: 0, passed: false });
    expect(result.details.map((d) => d.question_id)).toEqual(questions.map((q) => q.id));
    for (const d of result.details) expect(d.correct_answer).toBe(answerKey.get(d.question_id)!.text);
  });

  it("câu gõ tay được chấm không phân biệt hoa thường, dấu câu, khoảng trắng thừa", async () => {
    const { attempt_id, questions } = await start(learner);
    const answers = Object.fromEntries(
      questions.map((q) => [q.id, q.options ? rightAnswer(q) : `  ${rightAnswer(q).toUpperCase().replace(/[.!?,]/g, "")}  `]),
    );
    expect(await submit(learner, attempt_id, answers)).toMatchObject({ correct: 20, passed: true });
  });

  it("câu nghe chép chấp nhận các cách viết khác đã khai trong nội dung", async () => {
    // Tìm một câu nghe chép có cách viết khác được chấp nhận, rồi làm bài cho tới khi gặp nó.
    const [target] = await t.rows<{ id: string; form: string }>(
      `select q.id, s.accepted_forms[1] as form from public.level_test_questions q
       join public.sentences s on s.id = (q.payload ->> 'sentence_id')::uuid
       where q.type = 'listen_type' and cardinality(s.accepted_forms) > 0 limit 1`,
    );
    expect(target).toBeTruthy();
    await t.db.query("insert into public.level_test_attempts (id, user_id, level_id, pass_percent, question_ids) values ($1, $2, $3, 80, $4)", [
      "aaaaaaaa-0000-4000-8000-000000000001",
      learner,
      levelId,
      [target.id],
    ]);
    const result = await submit(learner, "aaaaaaaa-0000-4000-8000-000000000001", { [target.id]: target.form });
    expect(result).toMatchObject({ correct: 1, total: 1, percent: 100 });
  });

  it("không nộp lại được, và không nộp được bài của người khác", async () => {
    const { attempt_id, questions } = await start(learner);
    await submit(learner, attempt_id, answersWith(questions, 10));
    expect(await expectRejected(() => submit(learner, attempt_id, answersWith(questions, 20)))).toContain("attempt not open");
    const [row] = await t.rows<{ correct_count: number }>("select correct_count from public.level_test_attempts where id = $1", [attempt_id]);
    expect(row.correct_count).toBe(10);

    const mine = await start(learner);
    expect(await expectRejected(() => submit(other, mine.attempt_id, answersWith(mine.questions, 20)))).toContain("attempt not found");
  });

  it("nạp lại đề thì các lượt đang làm dở hết hiệu lực", async () => {
    const stale = await start(learner);
    const pool = await t.rows("select unit_id, type, source_type, source_id, payload from public.level_test_questions");
    await t.asUser(admin, () => t.rows("select public.publish_level_test($1, 20, 80, $2::jsonb)", [levelId, JSON.stringify(pool)]));
    expect(await expectRejected(() => submit(learner, stale.attempt_id, {}))).toContain("attempt not open");
    const [row] = await t.rows<{ status: string }>("select status from public.level_test_attempts where id = $1", [stale.attempt_id]);
    expect(row.status).toBe("expired");
    // Kết quả đã nộp trước đó vẫn còn nguyên.
    const [kept] = await t.rows<{ n: number }>("select count(*)::int as n from public.level_test_attempts where status = 'submitted' and passed");
    expect(kept.n).toBeGreaterThanOrEqual(1);
  });

  it("không nạp được đề thiếu câu hỏi cho một loại", async () => {
    const pool = await t.rows("select unit_id, type, source_type, source_id, payload from public.level_test_questions where type <> 'listen_type'");
    const message = await expectRejected(() => t.asUser(admin, () => t.rows("select public.publish_level_test($1, 20, 80, $2::jsonb)", [levelId, JSON.stringify(pool)])));
    expect(message).toContain("not enough questions");
  });
});
