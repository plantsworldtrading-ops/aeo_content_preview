import products from "./products.json";
import baselineFile from "./baseline.json";
import { guideList } from "./index.generated";
import kbFile from "./kb.json";
import kbVerificationFile from "./kb-verification.json";
import type { Kb, KbVerification, Product } from "./types";

export type { Guide, Product, Claim, Stage, Verification, Kb, KbEntry, KbStatus, KbVerification, Rendered } from "./types";

// One JSON file per plant (the data published to the Shopify plant_care_guide metaobject) plus its verification
// report. Both are copied in by aeo/scripts/sync_site.py.
export const guides = guideList.map((x) => x.guide);
export const productsByHandle: Record<string, Product> = products;
export const baseline = baselineFile.facts;

// The store-wide support knowledge base the website assistant answers from, with its verification report.
export const kb = kbFile as Kb;
export const kbVerification = kbVerificationFile as KbVerification;

export const SITE = "https://plantsworld.ae";
export const getGuide = (handle: string) => guideList.find((x) => x.guide.handle === handle)?.guide;
export const getVerification = (handle: string) => guideList.find((x) => x.guide.handle === handle)?.verification;
export const getRendered = (handle: string) => guideList.find((x) => x.guide.handle === handle)?.rendered;

export const STAGE_LABEL = {
  draft: "Draft",
  checked: "Checked",
  "fact-checked": "Fact-checked, awaiting sign-off",
  "signed-off": "Signed off",
} as const;
