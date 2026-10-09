const DETAIL_FIELDS = [
  ["description", "Indication"],
  ["usage", "How to use"],
  ["precautions", "Precautions"],
  ["side_effects", "Side effects"],
];

export default function MedicineCard({ medicine, onAddToCart }) {
  const { name, name_th, price, requires_prescription, stock } = medicine;
  const hasDetails = DETAIL_FIELDS.some(([key]) => medicine[key]) || name_th;

  return (
    <div className="relative flex flex-col gap-3 border border-line bg-surface p-5 pt-6">
      {/* เส้นปรุแบบฉลากยา */}
      <div className="absolute inset-x-0 top-2 border-t border-dashed border-line-strong" />

      {requires_prescription && (
        <span className="absolute right-0 top-0 border border-ink bg-ink px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper">
          ℞ Rx only
        </span>
      )}

      <h3 className="mt-1 font-display text-xl font-semibold leading-snug text-ink">
        {name}
      </h3>

      {hasDetails && (
        <details className="group text-sm">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.06em] text-leaf hover:underline">
            Details
          </summary>
          <dl className="mt-2 flex flex-col gap-2 border-l-2 border-leaf pl-3 leading-relaxed">
            {name_th && (
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
                  Thai name
                </dt>
                <dd className="text-ink">{name_th}</dd>
              </div>
            )}
            {DETAIL_FIELDS.map(
              ([key, label]) =>
                medicine[key] && (
                  <div key={key}>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
                      {label}
                    </dt>
                    <dd className="text-ink">{medicine[key]}</dd>
                  </div>
                )
            )}
          </dl>
        </details>
      )}

      <div className="mt-auto flex items-end justify-between border-t border-dashed border-line pt-3">
        <span className="font-mono text-lg text-ink">${price.toFixed(2)}</span>
        <span className="font-mono text-xs text-muted">{stock} in stock</span>
      </div>

      <button
        onClick={() => onAddToCart(medicine)}
        disabled={stock <= 0}
        className="w-full border border-ink py-2 font-mono text-xs uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-line-strong disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted"
      >
        {stock <= 0 ? "Out of stock" : "Add to cart"}
      </button>
    </div>
  );
}
