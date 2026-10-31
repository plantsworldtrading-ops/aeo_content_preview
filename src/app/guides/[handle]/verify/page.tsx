import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { baseline, getGuide, getVerification, guides, STAGE_LABEL } from "@/content/guides";
import VerifyForm from "./confirm";
import "../../guide.css";

export const dynamicParams = false;
export const generateStaticParams = () => guides.map((g) => ({ handle: g.handle }));

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const g = getGuide((await params).handle);
  return g ? { title: `Verify: ${g.name} care guide` } : {};
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
        and is it true for UAE and GCC homes (heat, AC, desalinated tap water, cold inland winter nights). Confirm the
        open items, correct anything that is wrong, and submit. The next guide is only started once this one is signed off.
      </p>
      <ul className="tally">
        <li><strong>{verified.length}</strong> verified</li>
        <li><strong>{corrected.length}</strong> corrected for the UAE</li>
        <li><strong>{local.length}</strong> need PlantsWorld confirmation</li>
      </ul>

      <VerifyForm handle={handle} hash={v.hash} local={local} corrected={corrected} verified={verified} signedOff={!!v.signoff} />

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
