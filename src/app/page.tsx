import Review from "./review";
import { heroes, sets } from "./items";

export default function Page() {
  return (
    <main>
      <header>
        <p className="eyebrow">PlantsWorld · product imagery</p>
        <h1>Hero image review</h1>
        <p className="lede">
          Candidate hero images for small indoor plants, shown with a yellow Kalanchoe in the white ceramic pot. Mark each
          image, add a note where you have one, then send your review at the bottom of the page.
        </p>
      </header>
      <Review heroes={heroes} sets={sets} />
    </main>
  );
}
