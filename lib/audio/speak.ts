// Giọng đọc. Hiện dùng speechSynthesis của trình duyệt; sau này thay bằng file âm thanh sinh sẵn
// mà không phải sửa nơi gọi.

const RATE_KEY = "lisb.speechRate";
const SLOW_FACTOR = 0.7;
const listeners = new Set<() => void>();

export function getSpeechRate(): number {
  try {
    const value = Number(window.localStorage.getItem(RATE_KEY));
    return value >= 0.5 && value <= 1.5 ? value : 1;
  } catch {
    return 1;
  }
}

export function setSpeechRate(rate: number) {
  try {
    window.localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    // Không lưu được (chế độ riêng tư): dùng mặc định.
  }
  for (const listener of listeners) listener();
}

export function subscribeSpeechRate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const wanted = locale.toLowerCase().replace("_", "-");
  const base = wanted.split("-")[0];
  const normalized = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");
  return voices.find((v) => normalized(v) === wanted) ?? voices.find((v) => normalized(v).startsWith(base));
}

/** Đọc một đoạn văn bản. Trả về false nếu trình duyệt không hỗ trợ. */
export function speak(text: string, locale: string, options: { slow?: boolean } = {}): boolean {
  if (!canSpeak()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  const voice = pickVoice(locale);
  if (voice) utterance.voice = voice;
  utterance.rate = getSpeechRate() * (options.slow ? SLOW_FACTOR : 1);
  synth.speak(utterance);
  return true;
}
