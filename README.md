# PlantsWorld review pages

Review pages for stakeholders. Reviewers mark each item, add notes, and send the review on WhatsApp or copy it.

- `/` — hero image review: candidate product hero images and studio decor sets. To add a round, put the images in
  `public/` and list them in `src/app/items.ts`.
- `/guides` — plant care guide review: draft AEO care guides, shown as they will look on plantsworld.ae
  (`/pages/plant-care/<handle>`). Each guide is one JSON file in `src/content/guides/`, the same data that is published
  to the Shopify `plant_care_guide` metaobject.
- `/guides/<handle>/verify` — verification report: every fact checked in general and for UAE/GCC conditions, and the
  items PlantsWorld staff must confirm (sent on WhatsApp). A guide is signed off before the next one is written.

Everything in `src/content/` is generated: edit the guides in `aeo/content/` and run `python3 aeo/scripts/sync_site.py`.

All pages are `noindex`, so the drafts never compete with the live pages in search.

```
npm install
npm run dev
```
