export type Guide = {
  handle: string;
  name: string;
  botanical_name: string;
  other_names: string[];
  question_title: string;
  quick_answer: string;
  quick_facts: { label: string; value: string }[];
  care_sections: { id: string; heading: string; paragraphs: string[]; tips?: string[]; products?: string[] }[];
  uae_year: { season: string; months: string; care: string }[];
  problems: { question: string; answer: string; signs: string; fix: string[]; products?: string[] }[];
  faqs: { q: string; a: string }[];
  product_handles: string[];
  image_url?: string;
  seo_title: string;
  seo_description: string;
  updated_on: string;
};

export type Product = { title: string; image?: string };

type Check = { verdict: string; note?: string; sources?: string[] };
type PerplexityCheck = { verdict: string; gcc: string; note?: string; sources?: string[] };
export type Claim = {
  id: string; where: string; claim: string; g: Check; u: Check; p?: PerplexityCheck; status: string; change?: string;
};
export type Stage = "draft" | "checked" | "fact-checked" | "signed-off";
export type Verification = {
  handle: string;
  stage: Stage;
  hash: string;
  content_errors: string[];
  ledger_errors: string[];
  signoff: { by: string; on: string; confirmed_local: string[]; notes: string } | null;
  claims: Claim[];
  factcheck_prompt: string;
};
