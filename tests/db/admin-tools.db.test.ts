import { beforeAll, describe, expect, it } from "vitest";
import { audioKey, createTestDb, expectRejected, type TestDb } from "./harness";

let t: TestDb;
let admin: string;
let learner: string;
let other: string;
let wordId: string;
let sentenceId: string;

const report = (userId: string, ownerType: string, ownerId: string, reason: string, extra: Record<string, unknown> = {}) =>
  t.asUser(userId, () =>
    t.rows<{ id: string }>(
      `insert into public.content_reports (user_id, owner_type, owner_id, locale, reason, note, status, resolved_at)
       values ($1, $2, $3, 'vi', $4, $5, $6, $7) returning id`,
      [extra.as ?? userId, ownerType, ownerId, reason, extra.note ?? null, extra.status ?? "open", extra.resolvedAt ?? null],
    ),
  );

beforeAll(async () => {
  t = await createTestDb();
  admin = await t.createUser({ admin: true });
  learner = await t.createUser();
  other = await t.createUser();
  wordId = (await t.rows<{ id: string }>("select id from public.words where lemma = 'hello'"))[0].id;
  sentenceId = (await t.rows<{ id: string }>("select id from public.sentences order by text limit 1"))[0].id;
}, 120_000);

describe("báo lỗi nội dung", () => {
  it("người học báo được lỗi của một từ và một câu, kèm ghi chú", async () => {
    const [word] = await report(learner, "word", wordId, "meaning", { note: "Nghĩa chưa đủ" });
    const [sentence] = await report(learner, "sentence", sentenceId, "audio");
    expect(word.id).toBeTruthy();
    expect(sentence.id).toBeTruthy();
  });

  it("không báo trùng cùng một lỗi khi báo cáo trước còn mở, nhưng báo lý do khác thì được", async () => {
    expect(await expectRejected(() => report(learner, "word", wordId, "meaning"))).toContain("content_reports_open_unique");
    expect((await report(learner, "word", wordId, "spelling")).length).toBe(1);
    // Người khác vẫn báo được cùng lỗi đó.
    expect((await report(other, "word", wordId, "meaning")).length).toBe(1);
  });

  it("người học không báo thay người khác và không tự đặt trạng thái đã xử lý", async () => {
    await expectRejected(() => report(learner, "word", wordId, "other", { as: other }));
    await expectRejected(() => report(learner, "sentence", sentenceId, "other", { status: "fixed" }));
    await expectRejected(() => report(learner, "sentence", sentenceId, "other", { resolvedAt: new Date().toISOString() }));
  });

  it("ghi chú quá dài hoặc mã lý do quá dài bị từ chối", async () => {
    expect(await expectRejected(() => report(learner, "sentence", sentenceId, "other", { note: "x".repeat(501) }))).toContain("content_reports_note_length");
    expect(await expectRejected(() => report(learner, "sentence", sentenceId, "y".repeat(41)))).toContain("content_reports_reason_length");
  });

  it("người học chỉ thấy báo cáo của mình và không sửa hay xóa được", async () => {
    const mine = await t.asUser(learner, () => t.rows<{ user_id: string }>("select user_id from public.content_reports"));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.user_id === learner)).toBe(true);

    await t.asUser(learner, () => t.rows("update public.content_reports set status = 'fixed'"));
    await t.asUser(learner, () => t.rows("delete from public.content_reports"));
    const [{ open, total }] = await t.rows<{ open: number; total: number }>(
      "select count(*) filter (where status = 'open')::int as open, count(*)::int as total from public.content_reports",
    );
    expect(open).toBe(total);
    expect(total).toBe(4);
  });

  it("quản trị thấy mọi báo cáo và đóng được; đóng rồi thì người học báo lại được", async () => {
    const all = await t.asUser(admin, () => t.rows<{ id: string; user_id: string; reason: string }>("select id, user_id, reason from public.content_reports"));
    expect(all.length).toBe(4);

    const target = all.find((r) => r.user_id === learner && r.reason === "meaning")!;
    const updated = await t.asUser(admin, () =>
      t.rows("update public.content_reports set status = 'fixed', resolved_at = now(), resolved_by = $1 where id = $2 returning id", [admin, target.id]),
    );
    expect(updated.length).toBe(1);
    expect((await report(learner, "word", wordId, "meaning")).length).toBe(1);
  });
});

describe("nghe duyệt âm thanh", () => {
  const key = audioKey("hello");
  const upsert = (userId: string, verdict: string, note: string | null = null) =>
    t.asUser(userId, () =>
      t.rows(
        `insert into public.audio_reviews (audio_key, voice, text, verdict, note, reviewed_by) values ($1, 'af_heart', 'hello', $2, $3, $4)
         on conflict (audio_key, voice) do update set verdict = excluded.verdict, note = excluded.note, reviewed_by = excluded.reviewed_by, reviewed_at = now()
         returning verdict`,
        [key, verdict, note, userId],
      ),
    );

  it("quản trị đánh dấu được và đổi được kết luận; mỗi file một dòng", async () => {
    await upsert(admin, "ok");
    await upsert(admin, "bad", "Đọc thành hai âm tiết rời");
    const rows = await t.rows<{ verdict: string; note: string }>("select verdict, note from public.audio_reviews");
    expect(rows).toEqual([{ verdict: "bad", note: "Đọc thành hai âm tiết rời" }]);
  });

  it("người học không đọc và không ghi được", async () => {
    expect(await t.asUser(learner, () => t.rows("select 1 from public.audio_reviews"))).toEqual([]);
    await expectRejected(() => upsert(learner, "ok"));
    expect((await t.rows<{ verdict: string }>("select verdict from public.audio_reviews"))[0].verdict).toBe("bad");
  });

  it("khóa file sai định dạng hoặc kết luận lạ bị từ chối", async () => {
    await expectRejected(() =>
      t.asUser(admin, () => t.rows("insert into public.audio_reviews (audio_key, voice, text, verdict) values ('../etc', 'af_heart', 'x', 'ok')")),
    );
    await expectRejected(() => upsert(admin, "maybe"));
  });
});
