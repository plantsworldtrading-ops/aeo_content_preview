import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, getRendered, guides } from "@/content/guides";
import "../guide.css";

export const dynamicParams = false;
export const generateStaticParams = () => guides.map((g) => ({ handle: g.handle }));

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const g = getGuide((await params).handle);
  return g ? { title: g.seo_title, description: g.seo_description } : {};
}

// The page is the HTML from aeo/scripts/preview.py, which mirrors aeo/shopify/theme/sections/plant-care-guide.liquid.
// sync_site.py copies it in, so the review site shows exactly what the live page will show.
export default async function GuidePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const g = getGuide(handle);
  const r = getRendered(handle);
  if (!g || !r) notFound();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: r.css }} />
      <div dangerouslySetInnerHTML={{ __html: r.body }} />
      <p className="verify-link">
        Draft for review · <a href={`/guides/${handle}/verify`}>Verify the facts in this guide →</a>
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: r.jsonld }} />
    </>
  );
}
