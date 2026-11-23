import { describe, expect, it } from "vitest";
import { newCardSchedule, scheduleReview } from "./fsrs";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-11-23T02:00:00.000Z");

describe("lịch ôn FSRS", () => {
  it("thẻ mới đến hạn ngay", () => {
    const card = newCardSchedule(t0);
    expect(card.state).toBe(0);
    expect(card.reps).toBe(0);
    expect(new Date(card.due_at).getTime()).toBe(t0.getTime());
  });

  it("trả lời Easy đẩy thẻ đi xa hơn Good, Good xa hơn Again", () => {
    const card = newCardSchedule(t0);
    const due = (r: 1 | 3 | 4) => new Date(scheduleReview(card, r, t0).schedule.due_at).getTime();
    expect(due(4)).toBeGreaterThan(due(3));
    expect(due(3)).toBeGreaterThan(due(1));
  });

  it("nhớ đúng nhiều lần thì khoảng cách ôn tăng dần", () => {
    let card = newCardSchedule(t0);
    let now = t0;
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      card = scheduleReview(card, 3, now).schedule;
      const due = new Date(card.due_at);
      intervals.push(due.getTime() - now.getTime());
      now = due;
    }
    expect(card.state).toBe(2); // Review
    expect(intervals[5]).toBeGreaterThan(intervals[3]);
    expect(intervals[5]).toBeGreaterThan(7 * DAY);
  });

  it("quên (Again) ở thẻ đang ôn làm tăng lapses và kéo hạn về gần", () => {
    let card = newCardSchedule(t0);
    let now = t0;
    for (let i = 0; i < 5; i++) {
      card = scheduleReview(card, 3, now).schedule;
      now = new Date(card.due_at);
    }
    const before = card;
    const { schedule, log } = scheduleReview(before, 1, now);
    expect(schedule.lapses).toBe(before.lapses + 1);
    expect(new Date(schedule.due_at).getTime() - now.getTime()).toBeLessThan(DAY);
    expect(log.rating).toBe(1);
    expect(log.state_before).toBe(before.state);
    expect(log.stability_before).toBe(before.stability);
  });
});
