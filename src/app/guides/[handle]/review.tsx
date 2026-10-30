"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Verdict = "good" | "change";
type Answer = { verdict?: Verdict; note?: string };
type Draft = { name: string; answers: Record<string, Answer>; overall: string; hidden: boolean };
export type Part = { id: string; label: string };

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "good", label: "Looks good" },
  { value: "change", label: "Needs changes" },
];

type Review = { draft: Draft; update: (patch: Partial<Draft>) => void; mark: (id: string, patch: Answer) => void };
const ReviewContext = createContext<Review | null>(null);
const useReview = () => useContext(ReviewContext)!;

export function ReviewProvider({ handle, children }: { handle: string; children: React.ReactNode }) {
  const store = `pw-guide-review-${handle}`;
  const [draft, setDraft] = useState<Draft>({ name: "", answers: {}, overall: "", hidden: false });

  // Same as the hero review: restore an unsent review after mount so the prerendered HTML matches the first render.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(store) ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft((d) => ({ ...d, ...saved }));
    } catch {}
  }, [store]);
  useEffect(() => {
    try {
      localStorage.setItem(store, JSON.stringify(draft));
    } catch {}
  }, [store, draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const mark = (id: string, patch: Answer) =>
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { ...d.answers[id], ...patch } } }));

  return (
    <ReviewContext.Provider value={{ draft, update, mark }}>
      <div className={draft.hidden ? "review-hidden" : ""}>
        <div className="review-toggle">
          <button onClick={() => update({ hidden: !draft.hidden })}>
            {draft.hidden ? "Show review controls" : "Hide review controls (see the clean page)"}
          </button>
        </div>
        {children}
      </div>
    </ReviewContext.Provider>
  );
}

export function ReviewBar({ id, label }: Part) {
  const { draft, mark } = useReview();
  const a = draft.answers[id] ?? {};
  return (
    <div className={`review-bar ${a.verdict ?? ""}`}>
      <span className="review-bar__label">Review: {label}</span>
      <div className="review-bar__buttons" role="radiogroup" aria-label={`Verdict for ${label}`}>
        {VERDICTS.map((v) => (
          <button
            key={v.value}
            role="radio"
            aria-checked={a.verdict === v.value}
            className={`verdict ${v.value} ${a.verdict === v.value ? "on" : ""}`}
            onClick={() => mark(id, { verdict: a.verdict === v.value ? undefined : v.value })}
          >
            {v.label}
          </button>
        ))}
      </div>
      <textarea
        rows={a.verdict === "change" || a.note ? 2 : 1}
        placeholder="What should change? (optional)"
        value={a.note ?? ""}
        onChange={(e) => mark(id, { note: e.target.value })}
      />
    </div>
  );
}

export function SendReview({ title, parts }: { title: string; parts: Part[] }) {
  const { draft, update } = useReview();
  const { name, answers, overall } = draft;
  const [copied, setCopied] = useState(false);

  const rows = parts
    .filter((p) => answers[p.id]?.verdict || answers[p.id]?.note)
    .map((p) => {
      const a = answers[p.id];
      const verdict = a.verdict === "good" ? "looks good" : a.verdict === "change" ? "needs changes" : "note";
      return `- ${p.label}: ${verdict}${a.note ? ` — ${a.note}` : ""}`;
    });
  const summary = [
    `${title} care guide — review from ${name || "(no name)"}`,
    "",
    ...(rows.length ? ["*Sections*", ...rows, ""] : []),
    ...(overall ? ["*Overall*", overall] : []),
  ].join("\n").trim();
  const marked = parts.filter((p) => answers[p.id]?.verdict).length;

  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="send review-only">
      <h2>Send your review</h2>
      <label className="name">
        Your name
        <input value={name} onChange={(e) => update({ name: e.target.value })} placeholder="So we know whose review this is" />
      </label>
      <label>
        Overall comments
        <textarea
          value={overall}
          onChange={(e) => update({ overall: e.target.value })}
          rows={3}
          placeholder="Tone, length, anything missing, anything wrong for the UAE…"
        />
      </label>
      <p className="count">{marked} of {parts.length} sections marked</p>
      <div className="actions">
        <a className="primary" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
        <button onClick={copy}>{copied ? "Copied" : "Copy review"}</button>
      </div>
      <pre className="preview">{summary}</pre>
    </section>
  );
}
