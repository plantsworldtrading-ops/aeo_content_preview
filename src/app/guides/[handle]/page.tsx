/* eslint-disable @next/next/no-img-element -- product images come straight from the Shopify CDN, as on the live page */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, guides, productsByHandle, SITE, type Guide } from "@/content/guides";
import { ReviewBar, ReviewProvider, SendReview, type Part } from "./review";
import "../guide.css";

export const dynamicParams = false;
export const generateStaticParams = () => guides.map((g) => ({ handle: g.handle }));

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const g = getGuide((await params).handle);
  return g ? { title: `Review: ${g.seo_title}`, description: g.seo_description } : {};
}

// Mirrors aeo/shopify/theme/sections/plant-care-guide.liquid so reviewers see what goes live.
function ShopLinks({ label, handles }: { label: string; handles?: string[] }) {
  const items = (handles ?? []).filter((h) => productsByHandle[h]);
  if (!items.length) return null;
  return (
    <p className="pcg-shop">
      {label}:{" "}
      {items.map((h, i) => (
        <span key={h}>
          <a href={`${SITE}/products/${h}`}>{productsByHandle[h].title}</a>
          {i < items.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

function jsonLd(g: Guide) {
  const url = `${SITE}/pages/plant-care/${g.handle}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article", "@id": `${url}#article`, headline: g.question_title, description: g.quick_answer,
        about: { "@type": "Thing", name: g.name, alternateName: g.other_names, description: g.botanical_name },
        image: g.image_url, dateModified: g.updated_on, inLanguage: "en-AE", mainEntityOfPage: url,
        author: { "@type": "Organization", name: "PlantsWorld", url: SITE },
        publisher: { "@type": "Organization", name: "PlantsWorld", url: SITE },
      },
      {
        "@type": "FAQPage", "@id": `${url}#faq`,
        mainEntity: [
          ...g.problems.map((p) => ({ "@type": "Question", name: p.question, acceptedAnswer: { "@type": "Answer", text: `${p.answer} ${p.signs}` } })),
          ...g.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Plant Care", item: `${SITE}/pages/plant-care` },
          { "@type": "ListItem", position: 3, name: g.name },
        ],
      },
    ],
  };
}

export default async function GuidePage({ params }: { params: Promise<{ handle: string }> }) {
  const g = getGuide((await params).handle);
  if (!g) notFound();

  const parts: Part[] = [
    { id: "answer", label: "Title and quick answer" },
    { id: "facts", label: "Quick facts" },
    ...g.care_sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: "uae-year", label: "Care through the UAE year" },
    ...g.problems.map((p, i) => ({ id: `problem-${i}`, label: p.question })),
    { id: "faq", label: "FAQs" },
    { id: "products", label: "Products shown" },
  ];
  const updated = new Date(g.updated_on).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <ReviewProvider handle={g.handle}>
      <div className="review-banner review-only">
        <Link href="/guides">← All guides</Link>
        <span>
          Draft for review · goes live at <code>plantsworld.ae/pages/plant-care/{g.handle}</code>
        </span>
      </div>

      <article className="pcg">
        <nav className="pcg-crumbs" aria-label="Breadcrumb">
          <a href={SITE}>Home</a> › <a href={`${SITE}/pages/plant-care`}>Plant Care</a> › <span>{g.name}</span>
        </nav>

        <header className="pcg-head">
          <div className="pcg-head__text">
            <h1>{g.question_title}</h1>
            <p className="pcg-botanical">
              {g.botanical_name} · Also called {g.other_names.join(", ")}
            </p>
            <p className="pcg-answer">{g.quick_answer}</p>
            <p className="pcg-updated">Updated {updated}</p>
          </div>
          {g.image_url && (
            <div className="pcg-head__img">
              <img src={g.image_url} alt={g.name} />
            </div>
          )}
        </header>
        <ReviewBar id="answer" label="Title and quick answer" />

        <section className="pcg-facts">
          <h2>{g.name} quick facts</h2>
          <table>
            <tbody>
              {g.quick_facts.map((f) => (
                <tr key={f.label}>
                  <th scope="row">{f.label}</th>
                  <td>{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <ReviewBar id="facts" label="Quick facts" />

        <nav className="pcg-toc" aria-label="On this page">
          <ul>
            {g.care_sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.heading}</a>
              </li>
            ))}
            <li><a href="#uae-year">Care through the UAE year</a></li>
            <li><a href="#problems">Common problems</a></li>
            <li><a href="#faq">FAQs</a></li>
          </ul>
        </nav>

        {g.care_sections.map((s) => (
          <section key={s.id} id={s.id} className="pcg-section">
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
            {!!s.tips?.length && (
              <ul className="pcg-tips">{s.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            )}
            <ShopLinks label="Shop" handles={s.products} />
            <ReviewBar id={s.id} label={s.heading} />
          </section>
        ))}

        <section id="uae-year" className="pcg-section">
          <h2>{g.name} care through the UAE year</h2>
          <div className="pcg-year">
            {g.uae_year.map((y) => (
              <div key={y.season} className="pcg-year__card">
                <h3>{y.season} <span>{y.months}</span></h3>
                <p>{y.care}</p>
              </div>
            ))}
          </div>
          <ReviewBar id="uae-year" label="Care through the UAE year" />
        </section>

        <section id="problems" className="pcg-section">
          <h2>Common {g.name.toLowerCase()} problems and how to fix them</h2>
          {g.problems.map((pr, i) => (
            <div key={pr.question} className="pcg-problem">
              <h3>{pr.question}</h3>
              <p>{pr.answer}</p>
              <p><strong>How to tell:</strong> {pr.signs}</p>
              <p><strong>How to fix it:</strong></p>
              <ol>{pr.fix.map((step) => <li key={step}>{step}</li>)}</ol>
              <ShopLinks label="Helps" handles={pr.products} />
              <ReviewBar id={`problem-${i}`} label={pr.question} />
            </div>
          ))}
        </section>

        <section id="faq" className="pcg-section">
          <h2>{g.name} FAQs</h2>
          {g.faqs.map((f, i) => (
            <details key={f.q} className="pcg-faq" open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
          <ReviewBar id="faq" label="FAQs" />
        </section>

        <section className="pcg-section">
          <h2>Buy a {g.name.toLowerCase()} in Dubai &amp; UAE</h2>
          <div className="pcg-products">
            {g.product_handles.map((h) => {
              const p = productsByHandle[h] ?? { title: h };
              return (
                <a key={h} className="pcg-card" href={`${SITE}/products/${h}`}>
                  {p.image && <img src={p.image} alt={p.title} loading="lazy" />}
                  <span className="pcg-card__t">{p.title}</span>
                </a>
              );
            })}
          </div>
          <ReviewBar id="products" label="Products shown" />
        </section>

        <SendReview title={g.name} parts={parts} />
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(g)) }} />
    </ReviewProvider>
  );
}
