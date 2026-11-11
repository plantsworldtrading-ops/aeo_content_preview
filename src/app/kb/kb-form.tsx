"use client";

import type { Kb, KbEntry, PolicyIssue } from "@/content/types";
import { MissedQuestions, SendBox, toneClass, useReview, Verdicts, type Option, type Review } from "../review-kit";

const ANSWER: Option[] = [
  { value: "confirm", label: "Right answer", tone: "approve" },
  { value: "change", label: "Needs changing", tone: "maybe" },
];
const DECISION: Option[] = [
  { value: "confirm", label: "Use the new answer", tone: "approve" },
  { value: "original", label: "Keep the KB offer", tone: "maybe" },
  { value: "change", label: "Different answer", tone: "reject" },
];
const ISSUE: Option[] = [
  { value: "confirm", label: "Fix the website", tone: "approve" },
  { value: "change", label: "Fix it another way", tone: "maybe" },
  { value: "original", label: "Not a problem", tone: "reject" },
];
const ROUTES: { value: string; label: string }[] = [
  { value: "AI", label: "Assistant answers" },
  { value: "AI_THEN_HUMAN", label: "Assistant answers, team follows up" },
  { value: "HUMAN", label: "Hand to the team" },
];
const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const STATUS_LABEL: Record<string, string> = {
  verified: "Matches policy",
  corrected: "Corrected",
  new: "New",
  team: "Team to confirm",
  decision: "Decision",
};

function Evidence({ e, sources }: { e: KbEntry; sources: Kb["sources"] }) {
  if (!e.evidence.length) return null;
  return (
    <ul className="kb-evidence">
      {e.evidence.map((s) => (
        <li key={s}>{s.startsWith("http") ? <a href={s} target="_blank" rel="noreferrer">{sources[s] ?? s}</a> : sources[s] ?? s}</li>
      ))}
    </ul>
  );
}

function EntryCard({ e, r, options, sources, showOriginal }: {
  e: KbEntry; r: Review; options: Option[]; sources: Kb["sources"]; showOriginal: "open" | "closed" | "none";
}) {
  const a = r.answers[e.id] ?? {};
  const route = a.route ?? e.route;
  return (
    <article id={e.id} className={`card kb-card ${toneClass(options, a.verdict)}`}>
      <p className="claim-id">
        {e.id} · <span className={`kb-status kb-${e.status}`}>{STATUS_LABEL[e.status]}</span>
        {e.recheck && <> · <span className="kb-status kb-recheck">Changed {shortDate(e.recheck.on)}</span></>}
      </p>
      <h3>{e.q}</h3>
      <p className="kb-answer">{e.a}</p>
      {e.original_a && showOriginal === "open" && (
        <p className="kb-was"><strong>The KB said:</strong> {e.original_a}</p>
      )}
      {e.recheck && (
        <p className="note kb-recheck-note"><strong>{shortDate(e.recheck.on)} policy check:</strong> {e.recheck.note}</p>
      )}
      {e.recheck_was && (
        <details className="kb-more" open>
          <summary>The answer before {shortDate(e.recheck!.on)}</summary>
          <p className="kb-was">{e.recheck_was}</p>
        </details>
      )}
      <p className="note"><strong>Check:</strong> {e.note}</p>
      {e.original_a && showOriginal === "closed" && (
        <details className="kb-more">
          <summary>What the KB said before</summary>
          <p className="kb-was">{e.original_a}</p>
        </details>
      )}
      <Evidence e={e} sources={sources} />
      <Verdicts options={options} value={a.verdict} onChange={(v) => r.mark(e.id, { verdict: v })} label={`Verdict for ${e.id}`} />
      <label className="kb-route">
        Who answers
        <select
          value={route}
          onChange={(ev) => r.mark(e.id, { route: ev.target.value === e.route ? undefined : ev.target.value })}
        >
          {ROUTES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <textarea
        rows={2}
        placeholder={a.verdict && a.verdict !== "confirm" ? "Write the answer customers should get" : "Notes (optional)"}
        value={a.note ?? ""}
        onChange={(ev) => r.mark(e.id, { note: ev.target.value })}
      />
    </article>
  );
}

function IssueCard({ p, r, sources }: { p: PolicyIssue; r: Review; sources: Kb["sources"] }) {
  const id = `policy:${p.id}`;
  const a = r.answers[id] ?? {};
  return (
    <article className={`card kb-card ${toneClass(ISSUE, a.verdict)}`}>
      <p className="claim-id">{p.id} · website policy</p>
      <h3>{p.title}</h3>
      <p className="kb-answer">{p.detail}</p>
      <p className="note"><strong>Suggested fix:</strong> {p.fix}</p>
      <ul className="kb-evidence">
        {p.where.map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{sources[u] ?? u}</a></li>)}
      </ul>
      <Verdicts options={ISSUE} value={a.verdict} onChange={(v) => r.mark(id, { verdict: v })} label={`Verdict for ${p.id}`} />
      <textarea
        rows={2}
        placeholder={a.verdict === "change" ? "How should it be fixed?" : "Notes (optional)"}
        value={a.note ?? ""}
        onChange={(ev) => r.mark(id, { note: ev.target.value })}
      />
    </article>
  );
}

export default function KbForm({ kb, hash, signedOff }: { kb: Kb; hash: string; signedOff: boolean }) {
  const r = useReview(kb.handle, hash);
  const decisions = kb.entries.filter((e) => e.status === "decision");
  const team = kb.entries.filter((e) => e.status === "team");
  const rest = kb.entries.filter((e) => e.status !== "decision" && e.status !== "team");
  const sections = [...new Set(rest.map((e) => e.section))];
  const answered = (list: KbEntry[]) => list.filter((e) => r.answers[e.id]?.verdict).length;
  const issues = kb.policy_issues ?? [];
  const check = kb.policy_check;
  const rechecked = check ? kb.entries.filter((e) => e.recheck?.on === check.checked_on) : [];
  const issuesDone = issues.filter((p) => r.answers[`policy:${p.id}`]?.verdict).length;
  const n = issues.length > 0 && !signedOff ? 1 : 0;

  return (
    <>
      {check && !signedOff && (
        <section>
          <h2>{n ? "1. " : ""}Problems on the website policies</h2>
          <p className="lede">
            On {shortDate(check.checked_on)} every answer was checked again against the live policies:{" "}
            {check.policies.map((p, i) => (
              <span key={p.url}>{i > 0 && ", "}<a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> ({p.dated})</span>
            ))}.
            {" "}These problems are on the website itself, not in the KB. Customers read the policies too, and the
            assistant must say the same as them, so fix them on the website or tell us what is right.
          </p>
          <div className="grid kb-grid">
            {issues.map((p) => <IssueCard key={p.id} p={p} r={r} sources={kb.sources} />)}
          </div>
          {rechecked.length > 0 && (
            <>
              <h3 className="faq-group">Answers changed or added in this check ({rechecked.length})</h3>
              <ul className="kb-changed">
                {rechecked.map((e) => (
                  <li key={e.id}>
                    <a href={`#${e.id}`}>{e.id}</a> {e.q} <span className={`kb-status kb-${e.status}`}>{STATUS_LABEL[e.status]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {decisions.length > 0 && !signedOff && (
        <section>
          <h2>{1 + n}. Decide: offers in the KB that do not exist in Shopify</h2>
          <p className="lede">
            These answers promise discounts, codes or gifts that are not set up in Shopify, or a 15% cap that active
            discounts already break. The assistant must never promise something checkout will not give. For each one, use
            the safe new answer, keep the KB offer (then it must be set up in Shopify before launch), or write a different answer.
          </p>
          <div className="grid kb-grid">
            {decisions.map((e) => <EntryCard key={e.id} e={e} r={r} options={DECISION} sources={kb.sources} showOriginal="open" />)}
          </div>
        </section>
      )}

      {!signedOff && (
        <section>
          <h2>{2 + n}. Store details the assistant gives out</h2>
          <p className="lede">Taken from the published policies. They replace the placeholders in the KB.</p>
          <div className="grid confirm-grid">
            {Object.entries(kb.store).map(([k, v]) => {
              const id = `store:${k}`;
              const a = r.answers[id] ?? {};
              return (
                <article key={id} className={`card ${toneClass(ANSWER, a.verdict)}`}>
                  <p className="claim-id">{k}</p>
                  <h3>{v.value}</h3>
                  <p className="note">{v.note}</p>
                  <Verdicts options={[{ ...ANSWER[0], label: "Correct" }, ANSWER[1]]} value={a.verdict} onChange={(x) => r.mark(id, { verdict: x })} label={`Verdict for ${k}`} />
                  <textarea rows={1} placeholder="Correct value" value={a.note ?? ""} onChange={(e) => r.mark(id, { note: e.target.value })} />
                </article>
              );
            })}
          </div>
        </section>
      )}

      {team.length > 0 && !signedOff && (
        <section>
          <h2>{3 + n}. Only PlantsWorld can confirm these</h2>
          <p className="lede">
            How you work day to day (pre-dispatch photos, what comes in a decorative pot, how plants are measured, the COD
            fee, quote thresholds), and answers where the published policies are unclear or say two different things.
          </p>
          <div className="grid kb-grid">
            {team.map((e) => <EntryCard key={e.id} e={e} r={r} options={ANSWER} sources={kb.sources} showOriginal="closed" />)}
          </div>
        </section>
      )}

      <section>
        <h2>{4 + n}. All other answers, by topic</h2>
        <p className="lede">
          Corrected answers were rewritten to match the published policies and Shopify; the old KB text is under each one.
          Answers marked New cover policy questions the KB was missing. Check each answer, and change who answers if needed.
        </p>
        {sections.map((s) => (
          <div key={s}>
            <h3 className="faq-group">{s}</h3>
            <div className="grid kb-grid">
              {rest.filter((e) => e.section === s).map((e) => (
                <EntryCard key={e.id} e={e} r={r} options={ANSWER} sources={kb.sources} showOriginal="closed" />
              ))}
            </div>
          </div>
        ))}
      </section>

      <MissedQuestions
        r={r}
        intro="Questions customers ask on WhatsApp, by phone or by email that none of the answers above cover. Add your answer, or leave it empty if you are not sure."
      />

      <SendBox
        r={r}
        otherLabel="Anything else the assistant should know or must never say?"
        counts={signedOff ? [] : [
          ...(issues.length ? [`${issuesDone} of ${issues.length} policy problems answered`] : []),
          `${answered(decisions)} of ${decisions.length} decisions made`,
          `${answered(team)} of ${team.length} team items confirmed`,
          `${answered(rest)} of ${rest.length} other answers checked`,
        ]}
      />
    </>
  );
}
