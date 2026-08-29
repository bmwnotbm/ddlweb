export default function MedicineCard({ medicine, onAddToCart }) {
  const { name, category, price, requires_prescription, stock } = medicine;

  return (
    <div className="relative flex flex-col gap-4 bg-surface p-5">
      {requires_prescription && (
        <span className="absolute right-0 top-0 border border-ink bg-ink px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper">
          Rx only
        </span>
      )}

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
          {category}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-snug text-ink">
          {name}
        </h3>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-line pt-3">
        <span className="font-mono text-lg text-ink">${price.toFixed(2)}</span>
        <span className="font-mono text-xs text-muted">{stock} in stock</span>
      </div>

      <button
        onClick={() => onAddToCart(medicine)}
        className="w-full border border-ink py-2 font-mono text-xs uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
      >
        Add to cart
      </button>
    </div>
  );
}
