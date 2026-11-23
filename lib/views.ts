// Kiểu dữ liệu đã gọt sẵn cho giao diện (dùng chung giữa máy chủ và trình duyệt).

export type WordView = {
  id: string;
  lemma: string;
  pos: string;
  pronunciation: string | null;
  /** Nghĩa bằng chính ngôn ngữ đích (đơn giản). */
  meaningTarget: string | null;
  /** Nghĩa bằng ngôn ngữ giải thích của người học. */
  meaningSource: string | null;
  usageNoteTarget: string | null;
  usageNoteSource: string | null;
  exampleSentenceId: string | null;
};

export type SentenceToken = { surface: string; wordId: string | null };

export type SentenceView = {
  id: string;
  text: string;
  accepted: string[];
  translation: string | null;
  noteTarget: string | null;
  noteSource: string | null;
  tokens: SentenceToken[];
  /** Các từ của câu ở dạng thẻ để sắp xếp. */
  chips: string[];
};

export type ContentBundle = {
  words: Record<string, WordView>;
  sentences: Record<string, SentenceView>;
};

export type ReviewCard = {
  id: string;
  kind: "word" | "sentence";
  wordId: string | null;
  sentenceId: string | null;
};
