import products from "./products.json";
import baselineFile from "./baseline.json";
import { guideList } from "./index.generated";
import type { Product } from "./types";

export type { Guide, Product, Claim, Stage, Verification } from "./types";

// One JSON file per plant (the data published to the Shopify plant_care_guide metaobject) plus its verification
// report. Both are copied in by aeo/scripts/sync_site.py.
export const guides = guideList.map((x) => x.guide);
export const productsByHandle: Record<string, Product> = products;
export const baseline = baselineFile.facts;

export const SITE = "https://plantsworld.ae";
export const getGuide = (handle: string) => guideList.find((x) => x.guide.handle === handle)?.guide;
export const getVerification = (handle: string) => guideList.find((x) => x.guide.handle === handle)?.verification;

export const STAGE_LABEL = {
  draft: "Draft",
  checked: "Checked",
  "fact-checked": "Fact-checked, awaiting sign-off",
  "signed-off": "Signed off",
} as const;
