import type { InsightCard } from "../insights";

export default function TripInsightCards({ cards }: { cards: InsightCard[] }) {
  return (
    <>
      <h2 className="tr-h">What the numbers say</h2>
      <p className="tr-h-sub">
        The patterns behind the total — useful if you are pricing up a similar trip.
      </p>

      <div className="tr-cards">
        {cards.map((c) => (
          <div key={c.key} className="tr-card">
            <span className="tr-card-k">{c.label}</span>
            <div className="tr-card-v">{c.value}</div>
            <p className="tr-card-s">{c.sub}</p>
          </div>
        ))}
      </div>
    </>
  );
}
