export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="flex items-center gap-4 border-b border-line py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-semibold text-ink">{item.name}</p>
        <p className="font-mono text-sm text-muted">${item.price.toFixed(2)}</p>
        {item.requires_prescription && (
          <span className="mt-1 inline-block border border-ink px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
            Rx only
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdateQty(item.id, item.qty - 1)}
          className="flex h-7 w-7 items-center justify-center border border-line-strong font-mono text-ink hover:border-ink"
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-sm">{item.qty}</span>
        <button
          onClick={() => onUpdateQty(item.id, item.qty + 1)}
          className="flex h-7 w-7 items-center justify-center border border-line-strong font-mono text-ink hover:border-ink"
        >
          +
        </button>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="ml-2 font-mono text-xs uppercase tracking-[0.06em] text-muted hover:text-ink"
      >
        Remove
      </button>
    </div>
  );
}
