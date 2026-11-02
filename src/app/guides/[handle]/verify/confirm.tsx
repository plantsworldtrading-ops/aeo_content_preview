"use client";

import { useEffect, useState } from "react";
import type { Claim, Guide } from "@/content/types";

type Verdict = "confirm" | "change";
type Answer = { verdict?: Verdict; note?: string };
type NewFaq = { q: string; a: string; heard?: string };
type Draft = { name: string; answers: Record<string, Answer>; overall: string; newFaqs: NewFaq[] };

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
const FAQ_VERDICTS: { value: Verdict; label: string }[] = [
  { value: "confirm", label: "Right answer" },
  { value: "change", label: "Needs changing" },
];
const PASSCODE = "pw-review-passcode";
const EMPTY_FAQ: NewFaq = { q: "", a: "", heard: "" };

function ClaimDetails({ c }: { c: Claim }) {
  const sources = [...new Set([...(c.g.sources ?? []), ...(c.u.sources ?? []), ...(c.p?.sources ?? [])])];
  return (
    <dl>
      <dt>General check</dt>
      <dd>{VERDICT_LABEL[c.g.verdict]}{c.g.note ? ` · ${c.g.note}` : ""}</dd>
      <dt>UAE/GCC check</dt>
      <dd>{VERDICT_LABEL[c.u.verdict]}{c.u.note ? ` · ${c.u.note}` : ""}</dd>
      {c.p && (
        <>
          <dt>Perplexity check</dt>
          <dd>{c.p.verdict} · GCC: {c.p.gcc}{c.p.note ? ` · ${c.p.note}` : ""}</dd>
        </>
      )}
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
export default function VerifyForm({ handle, hash, faqs, local, corrected, verified, signedOff }: {
  handle: string; hash: string; faqs: Guide["faqs"]; local: Claim[]; corrected: Claim[]; verified: Claim[]; signedOff: boolean;
}) {
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

  const mark = (id: string, patch: Answer) => {
    setState({});
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { ...d.answers[id], ...patch } } }));
  };
  const { name, answers, overall } = draft;
  const newFaqs = draft.newFaqs?.length ? draft.newFaqs : [{ ...EMPTY_FAQ }];
  const setNewFaq = (i: number, patch: Partial<NewFaq>) => {
    setState({});
    setDraft((d) => ({ ...d, newFaqs: newFaqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  };
  const faqKey = (f: Guide["faqs"][number], i: number) => `faq:${f.id ?? i}`;
  // Claim and FAQ verdicts share the items list (faq ids start with "faq:"); missed questions go in as verdict "add".
  const items = [
    ...Object.entries(answers)
      .filter(([, a]) => a.verdict || a.note?.trim())
      .map(([claim_id, a]) => ({ claim_id, verdict: a.verdict ?? "note", note: a.note?.trim() ?? "" })),
    ...newFaqs
      .filter((f) => f.q.trim())
      .map((f) => ({ claim_id: "new-faq", verdict: "add", q: f.q.trim(), a: f.a.trim(), note: f.heard?.trim() ?? "" })),
  ];
  const answeredLocal = local.filter((c) => answers[c.id]?.verdict).length;
  const answeredFaqs = faqs.filter((f, i) => answers[faqKey(f, i)]?.verdict).length;

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
      setDraft((d) => ({ ...d, answers: {}, overall: "", newFaqs: [{ ...EMPTY_FAQ }] }));
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

      {!signedOff && (
        <section>
          <h2>{local.length > 0 ? "2" : "1"}. Are these the right answers to what customers ask?</h2>
          <p className="lede">
            These answers go on the guide page and are what the website assistant will tell customers. Mark each one, and
            write how you would answer instead if it is wrong or incomplete.
          </p>
          {(["care", "buying"] as const).map((group) => {
            const list = faqs.map((f, i) => ({ f, i })).filter(({ f }) => (f.group ?? "care") === group);
            if (!list.length) return null;
            return (
              <div key={group}>
                <h3 className="faq-group">{group === "care" ? "Caring for it" : "Buying from PlantsWorld"}</h3>
                <div className="grid confirm-grid">
                  {list.map(({ f, i }) => {
                    const key = faqKey(f, i);
                    const a = answers[key] ?? {};
                    return (
                      <article key={key} className={`card ${a.verdict === "confirm" ? "approve" : a.verdict === "change" ? "maybe" : ""}`}>
                        <p className="claim-id">FAQ {i + 1}{f.kb?.length ? ` · from support ${f.kb.join(", ")}` : ""}</p>
                        <h3>{f.q}</h3>
                        <p className="note">{f.a}</p>
                        <div className="verdicts two" role="radiogroup" aria-label={`Verdict for FAQ ${i + 1}`}>
                          {FAQ_VERDICTS.map((v) => (
                            <button
                              key={v.value}
                              role="radio"
                              aria-checked={a.verdict === v.value}
                              className={`verdict ${v.value === "confirm" ? "approve" : "maybe"} ${a.verdict === v.value ? "on" : ""}`}
                              onClick={() => mark(key, { verdict: a.verdict === v.value ? undefined : v.value })}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={2}
                          placeholder={a.verdict === "change" ? "How would you answer the customer?" : "Notes (optional)"}
                          value={a.note ?? ""}
                          onChange={(e) => mark(key, { note: e.target.value })}
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <h2>Questions customers ask that are missing</h2>
        <p className="lede">
          Think of WhatsApp chats, calls and the shop floor. Add each question with the answer you give. If you are not sure
          of the answer, add the question anyway and leave the answer empty.
        </p>
        {newFaqs.map((f, i) => (
          <article key={i} className={`card new-faq ${f.q.trim() ? "approve" : ""}`}>
            <p className="claim-id">New question {i + 1}</p>
            <label>
              Question, as the customer asks it
              <input value={f.q} onChange={(e) => setNewFaq(i, { q: e.target.value })} placeholder="e.g. Can I keep it in my car for a day?" />
            </label>
            <label>
              Your answer
              <textarea rows={3} value={f.a} onChange={(e) => setNewFaq(i, { a: e.target.value })} placeholder="What you tell the customer" />
            </label>
            <label>
              How often do you hear it? (optional)
              <input value={f.heard ?? ""} onChange={(e) => setNewFaq(i, { heard: e.target.value })} placeholder="e.g. every week on WhatsApp" />
            </label>
            {newFaqs.length > 1 && (
              <button className="link" onClick={() => setDraft((d) => ({ ...d, newFaqs: newFaqs.filter((_, j) => j !== i) }))}>
                Remove
              </button>
            )}
          </article>
        ))}
        <div className="actions">
          <button onClick={() => setDraft((d) => ({ ...d, newFaqs: [...newFaqs, { ...EMPTY_FAQ }] }))}>+ Add another question</button>
        </div>
      </section>

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
        {!signedOff && <p className="count">{answeredFaqs} of {faqs.length} customer answers checked</p>}
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
