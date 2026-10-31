import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { baseline, getGuide, getVerification, guides, STAGE_LABEL, type Claim } from "@/content/guides";
import Confirm from "./confirm";
import "../../guide.css";

export const dynamicParams = false;
export const generateStaticParams = () => guides.map((g) => ({ handle: g.handle }));

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const g = getGuide((await params).handle);
  return g ? { title: `Verify: ${g.name} care guide` } : {};
}

const VERDICT_LABEL: Record<string, string> = {
  supported: "Supported",
  unverified: "Not confirmed",
  contradicted: "Contradicted",
  needs_local: "Needs PlantsWorld",
  "n/a": "Not UAE-specific",
};

function ClaimRow({ c }: { c: Claim }) {
  const sources = [...(c.g.sources ?? []), ...(c.u.sources ?? [])];
  return (
    <details className="claim">
      <summary>
        <span className="claim-id">{c.id}</span> {c.claim}
      </summary>
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
    </details>
  );
}

export default async function VerifyPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const g = getGuide(handle);
  const v = getVerification(handle);
  if (!g || !v) notFound();

  const local = v.claims.filter((c) => c.status === "needs_local");
  const corrected = v.claims.filter((c) => c.status === "corrected");
  const verified = v.claims.filter((c) => c.status === "verified");

  return (
    <main>
      <p className="eyebrow">
        <Link href="/guides">Care guides</Link> · <Link href={`/guides/${handle}`}>{g.name} guide</Link>
      </p>
      <h1>Verify the {g.name} guide</h1>
      <p className={`stage stage-${v.stage}`}>{STAGE_LABEL[v.stage]}{v.signoff ? ` by ${v.signoff.by} on ${v.signoff.on}` : ""}</p>
      <p className="lede">
        Every fact on the <Link href={`/guides/${handle}`}>guide page</Link> was checked twice: is it true in general,
        and is it true for UAE and GCC homes (heat, AC, desalinated tap water, cold inland winter nights). The next guide
        is only started once this one is signed off.
      </p>
      <ul className="tally">
        <li><strong>{verified.length}</strong> verified</li>
        <li><strong>{corrected.length}</strong> corrected for the UAE</li>
        <li><strong>{local.length}</strong> need PlantsWorld confirmation</li>
      </ul>

      {local.length > 0 && !v.signoff && (
        <section>
          <h2>1. Please confirm these for UAE customers</h2>
          <p className="lede">
            Research could not settle these. They depend on what PlantsWorld sees in UAE homes and from customers. Mark each
            one, correct it if needed, and send it on WhatsApp.
          </p>
          <Confirm handle={handle} name={g.name} hash={v.hash} claims={local} />
        </section>
      )}

      <section>
        <h2>{local.length && !v.signoff ? "2. " : ""}What we corrected for the UAE</h2>
        {corrected.map((c) => <ClaimRow key={c.id} c={c} />)}
      </section>

      <section>
        <h2>Verified facts</h2>
        <p className="lede">Tap a fact to see how it was checked.</p>
        {verified.map((c) => <ClaimRow key={c.id} c={c} />)}
      </section>

      <section>
        <h2>UAE/GCC conditions every guide is checked against</h2>
        {baseline.map((f) => (
          <details key={f.id} className="claim">
            <summary>
              <span className={`conf conf-${f.confidence}`}>{f.confidence}</span> {f.fact}
            </summary>
            {f.note && <p className="note">{f.note}</p>}
          </details>
        ))}
      </section>
    </main>
  );
}
