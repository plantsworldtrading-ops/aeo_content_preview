import type { Metadata } from "next";
import Link from "next/link";
import { kb, kbVerification, STAGE_LABEL } from "@/content/guides";
import KbForm from "./kb-form";
import "../guides/guide.css";

export const metadata: Metadata = { title: "Verify: support knowledge base" };

export default function KbPage() {
  const v = kbVerification;
  const count = (s: string) => kb.entries.filter((e) => e.status === s).length;
  return (
    <main>
      <p className="eyebrow">
        <Link href="/guides">Review</Link> · support knowledge base
      </p>
      <h1>Verify the support knowledge base</h1>
      <p className={`stage stage-${v.stage}`}>{STAGE_LABEL[v.stage]}{v.signoff ? ` by ${v.signoff.by} on ${v.signoff.on}` : ""}</p>
      <p className="lede">
        These {kb.entries.length} answers are what the website assistant will tell customers about photos, pots, prices,
        payment, delivery, returns and plant care. Every answer was checked on 2 Nov 2026 against the published policies
        and Shopify&apos;s live discounts and delivery rates, and checked again on 11 Nov 2026 against the updated Shipping,
        Refund, Terms, Privacy and Contact pages. Work through sections 1 to 4 first; they need your decision.
      </p>
      <ul className="tally">
        <li><strong>{count("decision")}</strong> decisions</li>
        <li><strong>{count("team")}</strong> for PlantsWorld to confirm</li>
        <li><strong>{count("corrected")}</strong> corrected</li>
        <li><strong>{count("verified")}</strong> match the policies</li>
        <li><strong>{count("new")}</strong> new from the policies</li>
        {kb.policy_issues && <li><strong>{kb.policy_issues.length}</strong> problems on the website policies</li>}
      </ul>
      <KbForm kb={kb} hash={v.hash} signedOff={!!v.signoff} />
    </main>
  );
}
