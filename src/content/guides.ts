import snakePlant from "./guides/snake-plant.json";
import products from "./products.json";

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

// One JSON file per plant, the same data that is published to the Shopify plant_care_guide metaobject.
export const guides: Guide[] = [snakePlant];
export const productsByHandle: Record<string, Product> = products;

export const SITE = "https://plantsworld.ae";
export const getGuide = (handle: string) => guides.find((g) => g.handle === handle);
