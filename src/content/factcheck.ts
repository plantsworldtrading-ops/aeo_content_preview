import type { Guide, Verification } from "./types";

// Plain-text prompt for an outside fact-checker (Perplexity). The review pages are noindex, so crawlers will not
// fetch them; the reviewer pastes this instead. Claim ids match the ledger, so replies map back onto it.
export function factCheckPrompt(g: Guide, v: Verification): string {
  const guide = [
    `# ${g.question_title}`,
    `${g.botanical_name}. Also called: ${g.other_names.join(", ")}.`,
    "",
    g.quick_answer,
    "",
    "## Quick facts",
    ...g.quick_facts.map((f) => `- ${f.label}: ${f.value}`),
    ...g.care_sections.flatMap((s) => ["", `## ${s.heading}`, ...s.paragraphs, ...(s.tips ?? []).map((t) => `- Tip: ${t}`)]),
    "",
    "## Care through the UAE year",
    ...g.uae_year.map((y) => `- ${y.season} (${y.months}): ${y.care}`),
    "",
    "## Common problems",
    ...g.problems.flatMap((p) => [
      `### ${p.question}`,
      p.answer,
      `How to tell: ${p.signs}`,
      ...p.fix.map((step, i) => `${i + 1}. ${step}`),
    ]),
    "",
    "## FAQs",
    ...g.faqs.flatMap((f) => [`Q: ${f.q}`, `A: ${f.a}`]),
  ];

  return [
    `You are fact-checking a plant care guide for an online plant shop in the UAE. Readers live in the UAE and other GCC countries (Saudi Arabia, Kuwait, Qatar, Bahrain, Oman).`,
    "",
    "Judge every claim against UAE/GCC conditions, not temperate ones:",
    "- Summer highs of 41–48 °C with hot nights (about 29–32 °C on the coast); intense sun through glass.",
    "- Homes and offices are air-conditioned most of the year (about 22–24 °C); indoor humidity varies, it is not reliably dry.",
    "- Tap water is desalinated and then remineralised.",
    "- Coastal UAE winters are mild (lows about 14–16 °C) but inland UAE (Al Ain, desert areas), Riyadh and Kuwait get nights below 10 °C, sometimes near 0 °C.",
    "- The outdoor growing season is roughly October to April.",
    "",
    "For EACH numbered claim below, reply with one row in a table with these columns:",
    "claim id | general verdict (correct / partly correct / wrong / cannot verify) | UAE/GCC verdict (correct / partly correct / wrong / not applicable) | what is wrong and the corrected wording | sources (URLs)",
    "",
    "Then list anything in the full guide text that is wrong for UAE/GCC readers but is not covered by a claim, quoting the sentence.",
    "Prefer authoritative sources: botanical databases (POWO, RHS), ASPCA, university extension services, peer-reviewed studies, UAE/GCC government or meteorological sources. Say 'cannot verify' rather than guess.",
    "",
    `## Claims to check (${v.claims.length})`,
    ...v.claims.map((c) => `${c.id}. ${c.claim}`),
    "",
    "## Full guide text",
    ...guide,
  ].join("\n");
}
