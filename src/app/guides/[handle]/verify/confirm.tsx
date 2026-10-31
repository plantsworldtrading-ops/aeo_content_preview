"use client";

import { useEffect, useState } from "react";
import type { Claim } from "@/content/types";

type Verdict = "confirm" | "change";
type Answer = { verdict?: Verdict; note?: string };
type Draft = { name: string; answers: Record<string, Answer>; overall: string };

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "confirm", label: "Correct for the UAE" },
  { value: "change", label: "Needs changing" },
];
const VERDICT_LABEL: Record<string, string> = {
  supported: "Supported",
  unverified: "Not confirmed",
  contradicted: "Contradicted",
  needs_local: "Needs PlantsWorld",
  "n/a": "Not UAE-specific",
};
const PASSCODE = "pw-review-passcode";

function ClaimDetails({ c }: { c: Claim }) {
  const sources = [...(c.g.sources ?? []), ...(c.u.sources ?? [])];
  return (
    <dl>
      <dt>General check</dt>
      <dd>{VERDICT_LABEL[c.g.verdict]}{c.g.note ? ` · ${c.g.note}` : ""}</dd>
      <dt>UAE/GCC check</dt>
      <dd>{VERDICT_LABEL[c.u.verdict]}{c.u.note ? ` · ${c.u.note}` : ""}</dd>
      {c.change && (<><dt>What we changed</dt><dd>{c.change}</dd></>)}
      <dt>Where on the page</dt>
      <dd>{c.where}</dd>
      {sources.length > 0 && (
        <>
          <dt>Evidence (internal, not shown on the page)</dt>
          <dd>
            <ul>{sources.map((s) => <li key={s}><a href={s} target="_blank" rel="noreferrer">{new URL(s).hostname}</a></li>)}</ul>
          </dd>
        </>
      )}
    </dl>
  );
}

// Every claim can be corrected: needs_local claims ask for a verdict, the rest take an optional correction.
// Submissions are saved through /api/corrections; the unsent draft is kept on this device only.
export default function VerifyForm({ handle, hash, local, corrected, verified, signedOff }: {
  handle: string; hash: string; local: Claim[]; corrected: Claim[]; verified: Claim[]; signedOff: boolean;
}) {
  const store = `pw-verify-${handle}-${hash}`;
  const [draft, setDraft] = useState<Draft>({ name: "", answers: {}, overall: "" });
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

  const mark = (id: string, patch: Answer) => {
    setState({});
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { ...d.answers[id], ...patch } } }));
  };
  const { name, answers, overall } = draft;
  const items = Object.entries(answers)
    .filter(([, a]) => a.verdict || a.note?.trim())
    .map(([claim_id, a]) => ({ claim_id, verdict: a.verdict ?? "note", note: a.note?.trim() ?? "" }));
  const answeredLocal = local.filter((c) => answers[c.id]?.verdict).length;

  const submit = async () => {
    setState({ sending: true });
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, guide_handle: handle, content_hash: hash, reviewer: name, items, overall }),
      });
      const out = await res.json();
      if (!res.ok) return setState({ error: out.error ?? "Could not save." });
      try {
        localStorage.setItem(PASSCODE, passcode);
      } catch {}
      setDraft((d) => ({ ...d, answers: {}, overall: "" }));
      setState({ sentId: out.id });
    } catch {
      setState({ error: "No connection. Your answers are kept on this device; try again." });
    }
  };

  const correctionBox = (c: Claim) => (
    <textarea
      rows={2}
      placeholder="Suggest a correction (optional)"
      value={answers[c.id]?.note ?? ""}
      onChange={(e) => mark(c.id, { note: e.target.value })}
    />
  );

  return (
    <>
      {local.length > 0 && !signedOff && (
        <section>
          <h2>1. Please confirm these for UAE customers</h2>
          <p className="lede">
            Research could not settle these. They depend on what PlantsWorld sees in UAE homes and from customers.
          </p>
          <div className="grid confirm-grid">
            {local.map((c) => {
              const a = answers[c.id] ?? {};
              return (
                <article key={c.id} className={`card ${a.verdict === "confirm" ? "approve" : a.verdict === "change" ? "maybe" : ""}`}>
                  <p className="claim-id">{c.id} · {c.where}</p>
                  <h3>{c.claim}</h3>
                  <p className="note">{c.u.note}</p>
                  <div className="verdicts two" role="radiogroup" aria-label={`Verdict for ${c.id}`}>
                    {VERDICTS.map((v) => (
                      <button
                        key={v.value}
                        role="radio"
                        aria-checked={a.verdict === v.value}
                        className={`verdict ${v.value === "confirm" ? "approve" : "maybe"} ${a.verdict === v.value ? "on" : ""}`}
                        onClick={() => mark(c.id, { verdict: a.verdict === v.value ? undefined : v.value })}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder={a.verdict === "change" ? "What is right for UAE customers?" : "Notes (optional)"}
                    value={a.note ?? ""}
                    onChange={(e) => mark(c.id, { note: e.target.value })}
                  />
                </article>
              );
            })}
          </div>
        </section>
      )}

      {[
        { title: "What we corrected for the UAE", list: corrected },
        { title: "Verified facts", list: verified },
      ].map(({ title, list }) => (
        <section key={title}>
          <h2>{title}</h2>
          <p className="lede">Tap a fact to see how it was checked. If something is still wrong, write the correction under it.</p>
          {list.map((c) => (
            <details key={c.id} className={`claim ${answers[c.id]?.note ? "has-note" : ""}`}>
              <summary><span className="claim-id">{c.id}</span> {c.claim}</summary>
              <ClaimDetails c={c} />
              {correctionBox(c)}
            </details>
          ))}
        </section>
      ))}

      <section className="send">
        <h2>Send your corrections</h2>
        <label>
          Anything else on the guide page that is wrong or missing for UAE/GCC customers?
          <textarea
            value={overall}
            onChange={(e) => {
              setState({});
              setDraft((d) => ({ ...d, overall: e.target.value }));
            }}
            rows={3}
            placeholder="Quote the sentence and say what it should be"
          />
        </label>
        <div className="send-fields">
          <label className="name">
            Your name
            <input value={name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Who is reviewing" />
          </label>
          <label className="name">
            Team passcode
            <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" />
          </label>
        </div>
        {local.length > 0 && !signedOff && <p className="count">{answeredLocal} of {local.length} confirmations answered</p>}
        <p className="count">{items.length} item{items.length === 1 ? "" : "s"} ready to send</p>
        <div className="actions">
          <button className="primary" onClick={submit} disabled={state.sending || (!items.length && !overall.trim())}>
            {state.sending ? "Sending…" : "Submit corrections"}
          </button>
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.sentId && <p className="form-ok" role="status">Received, thank you. Reference #{state.sentId}.</p>}
      </section>
    </>
  );
}
