// Giọng đọc. Ưu tiên file âm thanh sinh sẵn (public/audio/<giọng>/<khóa>.mp3);
// nếu chưa có file cho đoạn văn bản đó thì dùng giọng đọc của trình duyệt.

export type VoiceChoice = "female" | "male";

/** Giọng sinh sẵn theo ngôn ngữ đích. Tên thư mục khớp với tools/audio/generate.mjs. */
const RECORDED_VOICES: Record<string, Record<VoiceChoice, string>> = {
  en: { female: "af_heart", male: "am_michael" },
};

/** Các giọng sinh sẵn của một ngôn ngữ đích (mã ngôn ngữ hoặc locale); rỗng nếu ngôn ngữ đó chưa có giọng. */
export function recordedVoices(locale: string): { choice: VoiceChoice; dir: string }[] {
  const voices = RECORDED_VOICES[locale.split("-")[0].toLowerCase()];
  return voices ? (Object.keys(voices) as VoiceChoice[]).map((choice) => ({ choice, dir: voices[choice] })) : [];
}

/** Tên thư mục này có phải một giọng sinh sẵn đã khai báo không. */
export function isRecordedVoice(dir: string): boolean {
  return Object.values(RECORDED_VOICES).some((voices) => Object.values(voices).includes(dir));
}

/** Đường dẫn file âm thanh sinh sẵn. */
export function recordedAudioUrl(voiceDir: string, audioKey: string): string {
  return `/audio/${voiceDir}/${audioKey}.mp3`;
}

const RATE_KEY = "lisb.speechRate";
const VOICE_KEY = "lisb.voice";
const SLOW_FACTOR = 0.7;
const listeners = new Set<() => void>();
let player: HTMLAudioElement | null = null;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Không lưu được (chế độ riêng tư): dùng mặc định.
  }
  for (const listener of listeners) listener();
}

export function getSpeechRate(): number {
  const value = Number(read(RATE_KEY));
  return value >= 0.5 && value <= 1.5 ? value : 1;
}

export function setSpeechRate(rate: number) {
  write(RATE_KEY, String(rate));
}

export function getVoiceChoice(): VoiceChoice {
  return read(VOICE_KEY) === "male" ? "male" : "female";
}

export function setVoiceChoice(choice: VoiceChoice) {
  write(VOICE_KEY, choice);
}

/** Dùng chung cho useSyncExternalStore của các tùy chọn giọng đọc. */
export function subscribeSpeechSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

function pickBrowserVoice(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const wanted = locale.toLowerCase().replace("_", "-");
  const base = wanted.split("-")[0];
  const normalized = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");
  return voices.find((v) => normalized(v) === wanted) ?? voices.find((v) => normalized(v).startsWith(base));
}

function speakWithBrowser(text: string, locale: string, rate: number) {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  const voice = pickBrowserVoice(locale);
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  synth.speak(utterance);
}

/**
 * Đọc một đoạn văn bản.
 * @param audioKey khóa của file sinh sẵn (do máy chủ tính); bỏ trống thì dùng giọng trình duyệt.
 */
export function speak(text: string, locale: string, options: { slow?: boolean; audioKey?: string | null } = {}): void {
  if (typeof window === "undefined") return;
  const rate = getSpeechRate() * (options.slow ? SLOW_FACTOR : 1);
  const voiceDir = RECORDED_VOICES[locale.split("-")[0].toLowerCase()]?.[getVoiceChoice()];

  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (player) {
    player.onerror = null;
    player.pause();
  }

  if (!options.audioKey || !voiceDir) {
    speakWithBrowser(text, locale, rate);
    return;
  }

  const audio = new Audio(recordedAudioUrl(voiceDir, options.audioKey));
  player = audio;
  audio.preservesPitch = true;
  audio.playbackRate = rate;
  // Chưa có file cho đoạn này (nội dung mới chưa sinh âm thanh): dùng giọng trình duyệt.
  audio.onerror = () => {
    if (player === audio) speakWithBrowser(text, locale, rate);
  };
  // Trình duyệt có thể chặn tự phát khi chưa có thao tác của người dùng; khi đó người học bấm nút Nghe.
  audio.play().catch(() => {});
}
