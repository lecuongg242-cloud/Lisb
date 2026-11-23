"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, signUp, type LoginState } from "./actions";

const initial: LoginState = { error: null, notice: null };

export function LoginForm({ confirmFailed }: { confirmFailed: boolean }) {
  const t = useTranslations("login");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [signInState, signInAction, signingIn] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initial);
  const isSignUp = mode === "signUp";
  const state = isSignUp ? signUpState : signInState;
  const pending = signingIn || signingUp;

  return (
    <form action={isSignUp ? signUpAction : signInAction} className="card flex flex-col gap-4">
      <h1 className="text-xl font-bold">{isSignUp ? t("signupTitle") : t("title")}</h1>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("email")}
        <input className="field" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("password")}
        <input
          className="field"
          type="password"
          name="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        {isSignUp && <span className="text-xs font-normal text-muted">{t("passwordHint")}</span>}
      </label>

      {state.error && (
        <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
          {t(state.error)}
        </p>
      )}
      {!state.error && confirmFailed && (
        <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
          {t("confirmFailed")}
        </p>
      )}
      {state.notice && (
        <p role="status" className="rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          {t(state.notice)}
        </p>
      )}

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {isSignUp ? t("signUp") : t("signIn")}
      </button>
      <button
        type="button"
        className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline"
        onClick={() => setMode(isSignUp ? "signIn" : "signUp")}
      >
        {isSignUp ? t("toSignIn") : t("toSignUp")}
      </button>
    </form>
  );
}
