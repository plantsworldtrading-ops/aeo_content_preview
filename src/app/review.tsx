"use client";

import { useEffect, useState } from "react";
import type { Item } from "./items";

type Verdict = "approve" | "maybe" | "reject";
type Answer = { verdict?: Verdict; note?: string };
type Answers = Record<string, Answer>;

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "approve", label: "Approve" },
  { value: "maybe", label: "Maybe" },
  { value: "reject", label: "Reject" },
];
const STORE = "pw-hero-review";

export default function Review({ heroes, sets }: { heroes: Item[]; sets: Item[] }) {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [overall, setOverall] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<Item | null>(null);

  // Keep an unsent review across reloads on this device.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "{}");
      setName(saved.name ?? "");
      setAnswers(saved.answers ?? {});
      setOverall(saved.overall ?? "");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ name, answers, overall }));
    } catch {}
  }, [name, answers, overall]);

  const set = (id: string, patch: Answer) => setAnswers((a) => ({ ...a, [id]: { ...a[id], ...patch } }));

  const lines = (title: string, items: Item[]) => {
    const rows = items
      .filter((i) => answers[i.id]?.verdict || answers[i.id]?.note)
      .map((i) => {
        const a = answers[i.id];
        return `- ${i.title}: ${a.verdict ?? "no verdict"}${a.note ? ` — ${a.note}` : ""}`;
      });
    return rows.length ? [`*${title}*`, ...rows, ""] : [];
  };
  const summary = [
    `Hero image review from ${name || "(no name)"}`,
    "",
    ...lines("Hero images", heroes),
    ...lines("Studio decor sets", sets),
    ...(overall ? ["*Overall*", overall] : []),
  ].join("\n").trim();
  const reviewed = Object.values(answers).filter((a) => a.verdict).length;

  const copy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const grid = (items: Item[]) => (
    <div className="grid">
      {items.map((item) => {
        const a = answers[item.id] ?? {};
        return (
          <article key={item.id} className={`card ${a.verdict ?? ""}`}>
            <button className="thumb" onClick={() => setOpen(item)} aria-label={`Enlarge ${item.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt={item.title} loading="lazy" />
            </button>
            <h3>{item.title}</h3>
            <p className="note">{item.note}</p>
            <div className="verdicts" role="radiogroup" aria-label={`Verdict for ${item.title}`}>
              {VERDICTS.map((v) => (
                <button
                  key={v.value}
                  role="radio"
                  aria-checked={a.verdict === v.value}
                  className={`verdict ${v.value} ${a.verdict === v.value ? "on" : ""}`}
                  onClick={() => set(item.id, { verdict: a.verdict === v.value ? undefined : v.value })}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={a.note ?? ""}
              onChange={(e) => set(item.id, { note: e.target.value })}
              rows={2}
            />
          </article>
        );
      })}
    </div>
  );

  return (
    <>
      <label className="name">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="So we know whose review this is" />
      </label>

      <section>
        <h2>Hero images</h2>
        <p className="lede">Finished product images. Tap an image to see it full size.</p>
        {grid(heroes)}
      </section>

      <section>
        <h2>Studio decor sets</h2>
        <p className="lede">
          Empty studio sets: the same linen backdrop and light, with different decor at the sides. The plant goes in the
          middle; the decor will sit slightly further in on the final images.
        </p>
        {grid(sets)}
      </section>

      <section className="send">
        <h2>Send your review</h2>
        <label>
          Overall comments
          <textarea value={overall} onChange={(e) => setOverall(e.target.value)} rows={3} placeholder="Anything else?" />
        </label>
        <p className="count">{reviewed} of {heroes.length + sets.length} images marked</p>
        <div className="actions">
          <a className="primary" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer">
            Send on WhatsApp
          </a>
          <button onClick={copy}>{copied ? "Copied" : "Copy review"}</button>
        </div>
        <pre className="preview">{summary}</pre>
      </section>

      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-label={open.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.src} alt={open.title} />
          <p>{open.title} · tap to close</p>
        </div>
      )}
    </>
  );
}
