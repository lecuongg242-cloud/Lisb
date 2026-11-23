"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, signInWithGoogle, signUp, type LoginState } from "./actions";

const initial: LoginState = { error: null, notice: null };

export function LoginForm({
  confirmFailed,
  googleEnabled,
}: {
  confirmFailed: boolean;
  googleEnabled: boolean;
}) {
  const t = useTranslations("login");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [signInState, signInAction, signingIn] = useActionState(
    signIn,
    initial,
  );
  const [signUpState, signUpAction, signingUp] = useActionState(
    signUp,
    initial,
  );
  const isSignUp = mode === "signUp";
  const state = isSignUp ? signUpState : signInState;
  const pending = signingIn || signingUp;

  return (
    <div className="card flex flex-col gap-4">
      <h1 className="text-xl font-bold">
        {isSignUp ? t("signupTitle") : t("title")}
      </h1>

      {googleEnabled && (
        <>
          <form action={signInWithGoogle}>
            <button type="submit" className="btn btn-secondary w-full gap-3">
              <GoogleMark />
              {t("google")}
            </button>
          </form>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            {t("or")}
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form
        action={isSignUp ? signUpAction : signInAction}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("email")}
          <input
            className="field"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
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
          {isSignUp && (
            <span className="text-xs font-normal text-muted">
              {t("passwordHint")}
            </span>
          )}
        </label>

        {state.error && (
          <p
            role="alert"
            className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text"
          >
            {t(state.error)}
          </p>
        )}
        {!state.error && confirmFailed && (
          <p
            role="alert"
            className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text"
          >
            {t("confirmFailed")}
          </p>
        )}
        {state.notice && (
          <p
            role="status"
            className="rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-dark"
          >
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
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
