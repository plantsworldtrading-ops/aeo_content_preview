import type { Metadata } from "next";
import Link from "next/link";
import { getVerification, guides, STAGE_LABEL } from "@/content/guides";
import "./guide.css";

export const metadata: Metadata = {
  title: "PlantsWorld care guide review",
  description: "Review the draft plant care guides before they go live on plantsworld.ae.",
};

export default function GuidesIndex() {
  return (
    <main>
      <header>
        <p className="eyebrow">PlantsWorld · plant care guides</p>
        <h1>Care guide review</h1>
        <p className="lede">
          Draft care guides for plantsworld.ae, shown exactly as they will look on the site. Each guide is fact-checked for
          UAE and GCC conditions and signed off before the next one is written.
        </p>
      </header>
      <ul className="guide-list">
        {guides.map((g) => {
          const v = getVerification(g.handle)!;
          return (
            <li key={g.handle}>
              <Link href={`/guides/${g.handle}`}>
                <strong>{g.name}</strong>
                <span>{g.question_title}</span>
              </Link>
              <Link className={`stage stage-${v.stage}`} href={`/guides/${g.handle}/verify`}>
                {STAGE_LABEL[v.stage]} · verify →
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
