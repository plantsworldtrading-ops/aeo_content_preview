import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { baseline, getGuide, getVerification, guides, kb, STAGE_LABEL } from "@/content/guides";
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
  const kbFaqs = (g.kb_faqs ?? []).map((id) => kb.entries.find((e) => e.id === id)).filter((e) => e !== undefined);

  return (
    <main>
      <p className="eyebrow">
        <Link href="/guides">Care guides</Link> · <Link href={`/guides/${handle}`}>{g.name} guide</Link>
      </p>
      <h1>Verify the {g.name} guide</h1>
      <p className={`stage stage-${v.stage}`}>{STAGE_LABEL[v.stage]}{v.signoff ? ` by ${v.signoff.by} on ${v.signoff.on}` : ""}</p>
      <p className="lede">
        Start with the customer questions: these answers are what the website assistant will tell customers. Mark each one
        right or wrong, and add the questions customers ask that are missing. Every fact on
        the <Link href={`/guides/${handle}`}>guide page</Link> was also checked twice: is it true in general, and is it true
        for UAE and GCC homes (heat, AC, desalinated tap water, cold inland winter nights), and the sources are listed at the
        end of the guide. Store answers (sizes, pots, delivery, photos) come from the support knowledge base and are
        reviewed on <Link href="/kb">the KB page</Link>. The next guide is only started once this one is signed off.
      </p>
      <ul className="tally">
        <li><strong>{verified.length}</strong> verified</li>
        <li><strong>{corrected.length}</strong> corrected for the UAE</li>
        <li><strong>{local.length}</strong> need PlantsWorld confirmation</li>
        <li><strong>{g.faqs.length}</strong> customer questions answered</li>
      </ul>


      <VerifyForm handle={handle} hash={v.hash} faqs={g.faqs} local={local} corrected={corrected} verified={verified} signedOff={!!v.signoff} sourceMap={Object.fromEntries((g.sources ?? []).map((x) => [x.id, x.url]))} />

      {kbFaqs.length > 0 && (
        <section>
          <h2>Store answers shown on this guide</h2>
          <p className="lede">
            The guide shows these support KB answers under &ldquo;Ordering from PlantsWorld&rdquo;. Review them on the KB page; a
            change there changes every guide that shows them.
          </p>
          <ul className="kb-changed">
            {kbFaqs.map((e) => (
              <li key={e.id}><Link href={`/kb#${e.id}`}>{e.id}</Link> {e.q}</li>
            ))}
          </ul>
        </section>
      )}

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
