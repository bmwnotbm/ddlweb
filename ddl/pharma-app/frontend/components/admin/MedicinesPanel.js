import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const inputCls =
  "border border-line-strong bg-paper px-2 py-1.5 font-mono text-[11px] text-ink outline-none focus:border-ink";

const EMPTY_FORM = {
  name: "",
  name_th: "",
  category_id: "",
  price: "",
  stock: "",
  requires_prescription: false,
  description: "",
};

export default function MedicinesPanel({ token }) {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({}); // medicineId -> { price, stock, requires_prescription }
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([api.listMedicines(), api.listCategories()])
      .then(([meds, cats]) => {
        setMedicines(meds);
        setCategories(cats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const refreshCategoryCounts = () => api.listCategories().then(setCategories).catch(() => {});

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter(
      (m) =>
        (!category || String(m.category_id) === category) &&
        (!q || m.name.toLowerCase().includes(q) || (m.name_th || "").toLowerCase().includes(q))
    );
  }, [medicines, category, search]);

  const valueOf = (m) => ({
    price: String(m.price),
    stock: String(m.stock),
    requires_prescription: m.requires_prescription,
    ...drafts[m.id],
  });

  const isDirty = (m) => {
    const d = valueOf(m);
    return (
      Number(d.price) !== m.price ||
      Number(d.stock) !== m.stock ||
      d.requires_prescription !== m.requires_prescription
    );
  };

  const setDraft = (m, patch) => setDrafts((prev) => ({ ...prev, [m.id]: { ...valueOf(m), ...patch } }));

  const handleSave = async (m) => {
    const d = valueOf(m);
    const price = Number(d.price);
    const stock = Number(d.stock);
    if (d.price === "" || !Number.isFinite(price) || price < 0) {
      setError(`${m.name}: price must be a number ≥ 0`);
      return;
    }
    if (d.stock === "" || !Number.isInteger(stock) || stock < 0) {
      setError(`${m.name}: stock must be a whole number ≥ 0`);
      return;
    }
    setBusyId(m.id);
    setError("");
    setNotice("");
    try {
      const updated = await api.updateMedicine(
        m.id,
        { price, stock, requires_prescription: d.requires_prescription },
        token
      );
      setMedicines((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      setDrafts((prev) => {
        const { [m.id]: _gone, ...rest } = prev;
        return rest;
      });
      setNotice(`Saved ${updated.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete ${m.name}? This can't be undone.`)) return;
    setBusyId(m.id);
    setError("");
    setNotice("");
    try {
      await api.deleteMedicine(m.id, token);
      setMedicines((prev) => prev.filter((x) => x.id !== m.id));
      refreshCategoryCounts();
      setNotice(`Deleted ${m.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setCreating(true);
    try {
      const created = await api.createMedicine(
        {
          name: form.name.trim(),
          name_th: form.name_th.trim() || null,
          category_id: Number(form.category_id),
          price: Number(form.price),
          stock: Number(form.stock),
          requires_prescription: form.requires_prescription,
          description: form.description.trim() || null,
        },
        token
      );
      setMedicines((prev) => [...prev, created]);
      refreshCategoryCounts();
      setForm(EMPTY_FORM);
      setShowForm(false);
      setNotice(`Added ${created.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Loading...</p>;
  }

  return (
    <div>
      <p className="mb-4 max-w-xl text-xs leading-relaxed text-muted">
        Prices and stock levels were generated as placeholders when the catalog was imported —
        set the real values here. “Rx only” items can only be ordered by customers with a verified
        prescription.
      </p>

      {error && <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{error}</p>}
      {notice && <p className="mb-4 border border-leaf px-3 py-2 text-xs text-leaf">{notice}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className={inputCls}
        >
          <option value="">All categories ({medicines.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.medicine_count})
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name"
          aria-label="Search medicines"
          className={`${inputCls} w-44`}
        />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:bg-paper hover:text-ink"
        >
          {showForm ? "Close" : "+ Add medicine"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-3 border border-line bg-surface p-5 sm:grid-cols-2"
        >
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name (English)"
            className={inputCls}
          />
          <input
            value={form.name_th}
            onChange={(e) => setForm({ ...form, name_th: e.target.value })}
            placeholder="ชื่อไทย (optional)"
            className={inputCls}
          />
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className={inputCls}
          >
            <option value="">Category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Price"
              className={`${inputCls} w-full`}
            />
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="Stock"
              className={`${inputCls} w-full`}
            />
          </div>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Indication (optional)"
            className={`${inputCls} sm:col-span-2`}
          />
          <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink">
            <input
              type="checkbox"
              checked={form.requires_prescription}
              onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })}
            />
            Rx only
          </label>
          <button
            type="submit"
            disabled={creating}
            className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
          >
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-leaf">
        {visible.length} shown
      </p>

      <div className="border border-line bg-surface">
        {visible.length === 0 && (
          <p className="px-5 py-10 text-center font-mono text-xs uppercase tracking-[0.08em] text-muted">
            No medicines match
          </p>
        )}
        {visible.map((m, i) => {
          const d = valueOf(m);
          const dirty = isDirty(m);
          return (
            <div
              key={m.id}
              className={`flex flex-col gap-3 p-4 lg:flex-row lg:items-center ${
                i === visible.length - 1 ? "" : "border-b border-line"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{m.name}</p>
                <p className="truncate font-mono text-[11px] text-muted">
                  {m.name_th ? `${m.name_th} · ` : ""}
                  {m.category}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 font-mono text-[11px] text-muted">
                  $
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={d.price}
                    onChange={(e) => setDraft(m, { price: e.target.value })}
                    aria-label={`Price of ${m.name}`}
                    className={`${inputCls} w-24`}
                  />
                </label>
                <label className="flex items-center gap-1 font-mono text-[11px] text-muted">
                  Stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={d.stock}
                    onChange={(e) => setDraft(m, { stock: e.target.value })}
                    aria-label={`Stock of ${m.name}`}
                    className={`${inputCls} w-20`}
                  />
                </label>
                <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-ink">
                  <input
                    type="checkbox"
                    checked={d.requires_prescription}
                    onChange={(e) => setDraft(m, { requires_prescription: e.target.checked })}
                  />
                  Rx
                </label>
                <button
                  onClick={() => handleSave(m)}
                  disabled={!dirty || busyId === m.id}
                  className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Save
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={busyId === m.id}
                  className="border border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:border-ink disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
