export type Item = { id: string; src: string; title: string; note: string };

export const heroes: Item[] = [
  { id: "living-round-soft", src: "/heroes/living-round-soft.webp", title: "Living room, soft light",
    note: "Round oak coffee table, soft window light. The room direction we are taking forward." },
  { id: "living-round-window", src: "/heroes/living-round-window.webp", title: "Living room, window light",
    note: "Same table with stronger directional window light from the left." },
  { id: "living-travertine-soft", src: "/heroes/living-travertine-soft.webp", title: "Living room, travertine table",
    note: "Pale travertine side table in place of oak." },
  { id: "linen-decor-even", src: "/heroes/linen-decor-even.webp", title: "Studio set, pebble and dish",
    note: "One linen set reused for every product, evenly lit, quiet decor at the sides." },
  { id: "linen-stones-even", src: "/heroes/linen-stones-even.webp", title: "Studio set, river stones",
    note: "The same studio set with stacked river stones and a slate disc." },
];

export const sets: Item[] = [
  { id: "set-driftwood", src: "/sets/driftwood.webp", title: "1. Driftwood and moss", note: "Soft and natural, a coastal feel." },
  { id: "set-grasses", src: "/sets/grasses.webp", title: "2. Dried grasses", note: "Airy; suits flowering plants." },
  { id: "set-pods", src: "/sets/pods.webp", title: "3. Lotus pod and cork", note: "Most character; darker pieces." },
  { id: "set-stones", src: "/sets/stones.webp", title: "4. River stones and slate", note: "Cleanest and calmest." },
  { id: "set-bisque", src: "/sets/bisque.webp", title: "5. Bisque ceramics", note: "Minimal; matches the white pot." },
];
