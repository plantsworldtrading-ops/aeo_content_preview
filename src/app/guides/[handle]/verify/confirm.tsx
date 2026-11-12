"use client";

import type { Claim, Guide } from "@/content/types";
import { MissedQuestions, SendBox, toneClass, useReview, Verdicts, type Option } from "../../../review-kit";

const CLAIM_VERDICTS: Option[] = [
  { value: "confirm", label: "Correct for the UAE", tone: "approve" },
  { value: "change", label: "Needs changing", tone: "maybe" },
];
const FAQ_VERDICTS: Option[] = [
  { value: "confirm", label: "Right answer", tone: "approve" },
  { value: "change", label: "Needs changing", tone: "maybe" },
];
const VERDICT_LABEL: Record<string, string> = {
  supported: "Supported",
  unverified: "Not confirmed",
  contradicted: "Contradicted",
  needs_local: "Needs PlantsWorld",
  "n/a": "Not UAE-specific",
};

// Ledger sources are URLs or ids from the guide's visible `sources` (FORMAT.md); internal file paths stay as text.
type SourceMap = Record<string, string>;
function SourceLink({ s, map }: { s: string; map: SourceMap }) {
  const url = map[s] ?? s;
  try {
    return <a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}{map[s] ? ` (${s})` : ""}</a>;
  } catch {
    return <code>{s}</code>;
  }
}

function ClaimDetails({ c, map }: { c: Claim; map: SourceMap }) {
  const sources = [...new Set([...(c.g.sources ?? []), ...(c.u.sources ?? [])])];
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
            <ul>{sources.map((s) => <li key={s}><SourceLink s={s} map={map} /></li>)}</ul>
          </dd>
        </>
      )}
    </dl>
  );
}

// Every claim can be corrected: needs_local claims ask for a verdict, the rest take an optional correction.
export default function VerifyForm({ handle, hash, faqs, local, corrected, verified, signedOff, sourceMap = {} }: {
  sourceMap?: SourceMap; handle: string; hash: string; faqs: Guide["faqs"]; local: Claim[]; corrected: Claim[]; verified: Claim[]; signedOff: boolean;
}) {
  const r = useReview(handle, hash);
  const { answers, mark } = r;
  const faqKey = (f: Guide["faqs"][number], i: number) => `faq:${f.id ?? i}`;
  const answeredLocal = local.filter((c) => answers[c.id]?.verdict).length;
  const answeredFaqs = faqs.filter((f, i) => answers[faqKey(f, i)]?.verdict).length;

  return (
    <>
      {!signedOff && (
        <section>
          <h2>1. Are these the right answers to what customers ask?</h2>
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
                      <article key={key} className={`card ${toneClass(FAQ_VERDICTS, a.verdict)}`}>
                        <p className="claim-id">FAQ {i + 1}{f.kb?.length ? ` · support ${f.kb.join(", ")}` : ""}</p>
                        <h3>{f.q}</h3>
                        <p className="note">{f.a}</p>
                        <Verdicts options={FAQ_VERDICTS} value={a.verdict} onChange={(v) => mark(key, { verdict: v })} label={`Verdict for FAQ ${i + 1}`} />
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

      <MissedQuestions
        r={r}
        intro="Think of WhatsApp chats, calls and the shop floor. Add each question with the answer you give. If you are not sure of the answer, add the question anyway and leave the answer empty."
      />

      {local.length > 0 && !signedOff && (
        <section>
          <h2>Please confirm these for UAE customers</h2>
          <p className="lede">
            Research could not settle these. They depend on what PlantsWorld sees in UAE homes and from customers.
          </p>
          <div className="grid confirm-grid">
            {local.map((c) => {
              const a = answers[c.id] ?? {};
              return (
                <article key={c.id} className={`card ${toneClass(CLAIM_VERDICTS, a.verdict)}`}>
                  <p className="claim-id">{c.id} · {c.where}</p>
                  <h3>{c.claim}</h3>
                  <p className="note">{c.u.note}</p>
                  <Verdicts options={CLAIM_VERDICTS} value={a.verdict} onChange={(v) => mark(c.id, { verdict: v })} label={`Verdict for ${c.id}`} />
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
              <ClaimDetails c={c} map={sourceMap} />
              <textarea
                rows={2}
                placeholder="Suggest a correction (optional)"
                value={answers[c.id]?.note ?? ""}
                onChange={(e) => mark(c.id, { note: e.target.value })}
              />
            </details>
          ))}
        </section>
      ))}

      <SendBox
        r={r}
        otherLabel="Anything else on the guide page that is wrong or missing for UAE/GCC customers?"
        counts={signedOff ? [] : [
          `${answeredFaqs} of ${faqs.length} customer answers checked`,
          ...(local.length ? [`${answeredLocal} of ${local.length} confirmations answered`] : []),
        ]}
      />
    </>
  );
}
