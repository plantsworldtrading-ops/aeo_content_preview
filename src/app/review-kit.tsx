"use client";

import { useEffect, useState } from "react";

// Shared pieces of the review forms (care guides and the support KB). Every submission goes through
// /api/corrections; the unsent draft is kept on this device only.

export type Answer = { verdict?: string; note?: string; route?: string };
export type NewFaq = { q: string; a: string; heard?: string };
export type Draft = { name: string; answers: Record<string, Answer>; overall: string; newFaqs: NewFaq[] };
export type Option = { value: string; label: string; tone: "approve" | "maybe" | "reject" };

const PASSCODE = "pw-review-passcode";
const EMPTY_FAQ: NewFaq = { q: "", a: "", heard: "" };

export function useReview(handle: string, hash: string) {
  const store = `pw-verify-${handle}-${hash}`;
  const [draft, setDraft] = useState<Draft>({ name: "", answers: {}, overall: "", newFaqs: [{ ...EMPTY_FAQ }] });
  const [passcode, setPasscode] = useState("");
  const [state, setState] = useState<{ sending?: boolean; error?: string; sentId?: number }>({});

  // Restored after mount so the prerendered HTML matches the first render.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(store) ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft((d) => ({ ...d, ...saved }));
      setPasscode(localStorage.getItem(PASSCODE) ?? "");
    } catch {}
  }, [store]);
  useEffect(() => {
    try {
      localStorage.setItem(store, JSON.stringify(draft));
    } catch {}
  }, [store, draft]);

  const newFaqs = draft.newFaqs?.length ? draft.newFaqs : [{ ...EMPTY_FAQ }];
  const update = (patch: Partial<Draft>) => {
    setState({});
    setDraft((d) => ({ ...d, ...patch }));
  };
  const mark = (id: string, patch: Answer) => {
    setState({});
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { ...d.answers[id], ...patch } } }));
  };

  // Verdicts and notes share one items list; missed questions go in as verdict "add".
  const items = [
    ...Object.entries(draft.answers)
      .filter(([, a]) => a.verdict || a.note?.trim() || a.route)
      .map(([claim_id, a]) => ({
        claim_id,
        verdict: a.verdict ?? "note",
        note: a.note?.trim() ?? "",
        ...(a.route && { route: a.route }),
      })),
    ...newFaqs
      .filter((f) => f.q.trim())
      .map((f) => ({ claim_id: "new-faq", verdict: "add", q: f.q.trim(), a: f.a.trim(), note: f.heard?.trim() ?? "" })),
  ];

  const submit = async () => {
    setState({ sending: true });
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, guide_handle: handle, content_hash: hash, reviewer: draft.name, items, overall: draft.overall }),
      });
      const out = await res.json();
      if (!res.ok) return setState({ error: out.error ?? "Could not save." });
      try {
        localStorage.setItem(PASSCODE, passcode);
      } catch {}
      setDraft((d) => ({ ...d, answers: {}, overall: "", newFaqs: [{ ...EMPTY_FAQ }] }));
      setState({ sentId: out.id });
    } catch {
      setState({ error: "No connection. Your answers are kept on this device; try again." });
    }
  };

  return { draft, answers: draft.answers, newFaqs, update, mark, items, passcode, setPasscode, state, submit };
}
export type Review = ReturnType<typeof useReview>;

export const toneClass = (options: Option[], verdict?: string) => options.find((o) => o.value === verdict)?.tone ?? "";

export function Verdicts({ options, value, onChange, label }: {
  options: Option[]; value?: string; onChange: (v?: string) => void; label: string;
}) {
  return (
    <div className={`verdicts ${options.length === 2 ? "two" : "three"}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={`verdict ${o.tone} ${value === o.value ? "on" : ""}`}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MissedQuestions({ r, intro }: { r: Review; intro: string }) {
  const { newFaqs, update } = r;
  const set = (i: number, patch: Partial<NewFaq>) => update({ newFaqs: newFaqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  return (
    <section>
      <h2>Questions customers ask that are missing</h2>
      <p className="lede">{intro}</p>
      {newFaqs.map((f, i) => (
        <article key={i} className={`card new-faq ${f.q.trim() ? "approve" : ""}`}>
          <p className="claim-id">New question {i + 1}</p>
          <label>
            Question, as the customer asks it
            <input value={f.q} onChange={(e) => set(i, { q: e.target.value })} placeholder="e.g. Can I keep it in my car for a day?" />
          </label>
          <label>
            Your answer
            <textarea rows={3} value={f.a} onChange={(e) => set(i, { a: e.target.value })} placeholder="What you tell the customer" />
          </label>
          <label>
            How often do you hear it? (optional)
            <input value={f.heard ?? ""} onChange={(e) => set(i, { heard: e.target.value })} placeholder="e.g. every week on WhatsApp" />
          </label>
          {newFaqs.length > 1 && (
            <button className="link" onClick={() => update({ newFaqs: newFaqs.filter((_, j) => j !== i) })}>
              Remove
            </button>
          )}
        </article>
      ))}
      <div className="actions">
        <button onClick={() => update({ newFaqs: [...newFaqs, { ...EMPTY_FAQ }] })}>+ Add another question</button>
      </div>
    </section>
  );
}

export function SendBox({ r, otherLabel, counts }: { r: Review; otherLabel: string; counts: string[] }) {
  const { draft, update, items, passcode, setPasscode, state, submit } = r;
  return (
    <section className="send">
      <h2>Send your review</h2>
      <label>
        {otherLabel}
        <textarea
          value={draft.overall}
          onChange={(e) => update({ overall: e.target.value })}
          rows={3}
          placeholder="Quote the sentence and say what it should be"
        />
      </label>
      <div className="send-fields">
        <label className="name">
          Your name
          <input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Who is reviewing" />
        </label>
        <label className="name">
          Team passcode
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" />
        </label>
      </div>
      {counts.map((c) => <p key={c} className="count">{c}</p>)}
      <p className="count">{items.length} item{items.length === 1 ? "" : "s"} ready to send</p>
      <div className="actions">
        <button className="primary" onClick={submit} disabled={state.sending || (!items.length && !draft.overall.trim())}>
          {state.sending ? "Sending…" : "Submit review"}
        </button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.sentId && <p className="form-ok" role="status">Received, thank you. Reference #{state.sentId}.</p>}
    </section>
  );
}
