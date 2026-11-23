"use client";

import { useActionState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { updateSettings } from "@/app/actions";
import { getSpeechRate, getVoiceChoice, setSpeechRate, setVoiceChoice, subscribeSpeechSettings, type VoiceChoice } from "@/lib/audio/speak";
import { getThemeChoice, setThemeChoice, subscribeTheme, type ThemeChoice } from "@/lib/theme";

type Props = { displayName: string; dailyGoal: number };

export function SettingsForm({ displayName, dailyGoal }: Props) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateSettings, { saved: false, error: false });
  // Tốc độ giọng đọc là tùy chọn của riêng thiết bị này nên lưu trên trình duyệt.
  const rate = useSyncExternalStore(subscribeSpeechSettings, getSpeechRate, () => 1);
  const voice = useSyncExternalStore(subscribeSpeechSettings, getVoiceChoice, (): VoiceChoice => "female");
  const theme = useSyncExternalStore(subscribeTheme, getThemeChoice, (): ThemeChoice => "system");

  return (
    <form action={action} className="card flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.displayName")}
        <input className="field" name="displayName" defaultValue={displayName} maxLength={60} autoComplete="nickname" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.dailyGoal")}
        <input className="field" name="dailyGoal" type="number" inputMode="numeric" min={1} max={20} defaultValue={dailyGoal} required />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.voice")}
        <select className="field" value={voice} onChange={(e) => setVoiceChoice(e.target.value as VoiceChoice)}>
          <option value="female">{t("settings.voiceFemale")}</option>
          <option value="male">{t("settings.voiceMale")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.speechRate")}
        <select className="field" value={String(rate)} onChange={(e) => setSpeechRate(Number(e.target.value))}>
          <option value="1">{t("settings.speechNormal")}</option>
          <option value="0.8">{t("settings.speechSlow")}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("settings.theme")}
        <select className="field" value={theme} onChange={(e) => setThemeChoice(e.target.value as ThemeChoice)}>
          <option value="system">{t("settings.themeSystem")}</option>
          <option value="light">{t("settings.themeLight")}</option>
          <option value="dark">{t("settings.themeDark")}</option>
        </select>
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-bad-text">
          {t("common.error")}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-brand-dark">
          {t("common.saved")}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {t("common.save")}
      </button>
    </form>
  );
}
