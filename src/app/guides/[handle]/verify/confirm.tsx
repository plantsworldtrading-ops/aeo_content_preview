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

// The claims only PlantsWorld staff can confirm. Same send-on-WhatsApp pattern as the hero review.
export default function Confirm({ handle, name: plant, hash, claims }: { handle: string; name: string; hash: string; claims: Claim[] }) {
  const store = `pw-verify-${handle}-${hash}`;
  const [draft, setDraft] = useState<Draft>({ name: "", answers: {}, overall: "" });
  const [copied, setCopied] = useState(false);

  // Restored after mount so the prerendered HTML matches the first render.
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

  const mark = (id: string, patch: Answer) =>
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: { ...d.answers[id], ...patch } } }));

  const { name, answers, overall } = draft;
  const rows = claims
    .filter((c) => answers[c.id]?.verdict || answers[c.id]?.note)
    .map((c) => {
      const a = answers[c.id];
      const verdict = a.verdict === "confirm" ? "CORRECT" : a.verdict === "change" ? "CHANGE" : "NOTE";
      return `- ${c.id} ${verdict}: ${c.claim}${a.note ? `\n  → ${a.note}` : ""}`;
    });
  const summary = [
    `${plant} guide verification from ${name || "(no name)"} (version ${hash})`,
    "",
    ...rows,
    ...(overall ? ["", "*Other corrections*", overall] : []),
  ].join("\n").trim();
  const done = claims.filter((c) => answers[c.id]?.verdict).length;

  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="grid confirm-grid">
        {claims.map((c) => {
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

      <section className="send">
        <h2>Send your verification</h2>
        <label className="name">
          Your name
          <input value={name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Who is confirming" />
        </label>
        <label>
          Anything else that is wrong for UAE/GCC customers?
          <textarea
            value={overall}
            onChange={(e) => setDraft((d) => ({ ...d, overall: e.target.value }))}
            rows={3}
            placeholder="Any other sentence on the guide page that is wrong or missing"
          />
        </label>
        <p className="count">{done} of {claims.length} items answered</p>
        <div className="actions">
          <a className="primary" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer">
            Send on WhatsApp
          </a>
          <button onClick={copy}>{copied ? "Copied" : "Copy verification"}</button>
        </div>
        <pre className="preview">{summary}</pre>
      </section>
    </>
  );
}
