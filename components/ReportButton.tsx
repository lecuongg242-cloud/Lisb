"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { reportContentAction } from "@/app/actions";
import { REPORT_REASONS, type ReportReason } from "@/lib/report";

type Props = {
  ownerType: "word" | "sentence";
  ownerId: string;
  /** Từ hoặc câu bị báo, hiện lại trong hộp thoại để người học biết mình đang báo mục nào. */
  text: string;
  /** icon: nút cờ nhỏ đặt cạnh nội dung. link: dòng chữ, dùng trong lúc luyện tập. */
  variant?: "icon" | "link";
  /** Lớp bổ sung để căn nút trong bố cục chứa nó. */
  className?: string;
};

type Status = "idle" | "sending" | "sent" | "duplicate" | "too_many" | "error";

/** Nút báo một từ hoặc một câu có lỗi. Hộp thoại chỉ được dựng khi người học bấm nút. */
export function ReportButton({ ownerType, ownerId, text, variant = "icon", className = "" }: Props) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`${t("button")}: ${text}`}
          title={t("button")}
          onClick={() => setOpen(true)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-page hover:text-bad-text ${className}`}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22V4" />
            <path d="M4 4h13l-2 4 2 4H4" />
          </svg>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`text-sm text-muted underline underline-offset-2 hover:text-bad-text ${className}`}>
          {t("button")}
        </button>
      )}
      {open && <ReportDialog ownerType={ownerType} ownerId={ownerId} text={text} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportDialog({ ownerType, ownerId, text, onClose }: Pick<Props, "ownerType" | "ownerId" | "text"> & { onClose: () => void }) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [needReason, setNeedReason] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const send = async () => {
    if (!reason) return setNeedReason(true);
    setStatus("sending");
    try {
      const result = await reportContentAction({ ownerType, ownerId, reason, note });
      if (result.ok) setStatus(result.duplicate ? "duplicate" : "sent");
      else setStatus(result.reason === "too_many" ? "too_many" : "error");
    } catch {
      setStatus("error");
    }
  };

  const finished = status === "sent" || status === "duplicate" || status === "too_many";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Bấm ra vùng tối bên ngoài thì đóng.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {t("title")}
          </h2>
          <p className="mt-1 rounded-2xl bg-page px-3 py-2 font-semibold break-words">{text}</p>
        </div>

        {finished ? (
          <>
            <p role="status" className={`rounded-2xl px-4 py-3 text-sm ${status === "too_many" ? "bg-warn-bg text-warn-text" : "bg-ok-bg text-ok-text"}`}>
              {t(status === "sent" ? "sent" : status === "duplicate" ? "duplicate" : "tooMany")}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => ref.current?.close()} autoFocus>
              {t("close")}
            </button>
          </>
        ) : (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm text-muted">{t("intro")}</legend>
              {REPORT_REASONS.map((code) => (
                <label
                  key={code}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2 ${reason === code ? "border-brand bg-brand-soft" : "border-line"}`}
                >
                  <input
                    type="radio"
                    name={`${titleId}-reason`}
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={reason === code}
                    onChange={() => {
                      setReason(code);
                      setNeedReason(false);
                    }}
                  />
                  <span>{t(`reason.${code}`)}</span>
                </label>
              ))}
            </fieldset>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">{t("noteLabel")}</span>
              <textarea
                className="field min-h-24 py-3"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </label>

            {needReason && (
              <p role="alert" className="text-sm text-bad-text">
                {t("chooseReason")}
              </p>
            )}
            {status === "error" && (
              <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
                {tc("error")}
              </p>
            )}

            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()} disabled={status === "sending"}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={() => void send()} disabled={status === "sending"}>
                {status === "sending" ? t("sending") : t("send")}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
