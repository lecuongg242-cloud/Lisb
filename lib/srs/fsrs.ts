import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";

/** Các cột lịch ôn của bảng cards (khớp cấu trúc Card của ts-fsrs). */
export type CardSchedule = {
  due_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review_at: string | null;
};

/** 1 = Again (quên), 2 = Hard (khó), 3 = Good (nhớ), 4 = Easy (dễ). */
export type ReviewRating = 1 | 2 | 3 | 4;

export type ReviewLogData = {
  rating: ReviewRating;
  state_before: number;
  due_before: string;
  stability_before: number;
  difficulty_before: number;
  elapsed_days: number;
  scheduled_days: number;
  reviewed_at: string;
};

// Tắt fuzz để lịch ôn tất định (dễ kiểm thử); bật lại khi số thẻ lớn và cần giãn tải.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

const GRADES: Record<ReviewRating, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

function toCard(row: CardSchedule): Card {
  return {
    due: new Date(row.due_at),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review_at ? new Date(row.last_review_at) : undefined,
  };
}

function toRow(card: Card): CardSchedule {
  return {
    due_at: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review_at: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** Lịch ôn của một thẻ mới tạo: đến hạn ngay. */
export function newCardSchedule(now: Date = new Date()): CardSchedule {
  return toRow(createEmptyCard(now));
}

/** Tính lịch ôn mới sau một lần trả lời, kèm dữ liệu ghi vào review_logs. */
export function scheduleReview(
  row: CardSchedule,
  rating: ReviewRating,
  now: Date = new Date(),
): { schedule: CardSchedule; log: ReviewLogData } {
  const result = scheduler.next(toCard(row), now, GRADES[rating]);
  return {
    schedule: toRow(result.card),
    log: {
      rating,
      state_before: row.state,
      due_before: row.due_at,
      stability_before: row.stability,
      difficulty_before: row.difficulty,
      elapsed_days: result.log.elapsed_days,
      scheduled_days: result.log.scheduled_days,
      reviewed_at: now.toISOString(),
    },
  };
}
