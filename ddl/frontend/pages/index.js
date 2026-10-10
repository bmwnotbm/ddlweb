import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import MedicineCard from "../components/MedicineCard";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api, API_URL } from "../lib/api";

function matches(med, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return [med.name, med.name_th, med.description].some((v) => v && v.toLowerCase().includes(needle));
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addToCart } = useCart();

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // หมวดที่เลือกเก็บไว้ใน URL (?category=...) เพื่อรีเฟรช/แชร์ลิงก์แล้วยังอยู่หมวดเดิม
  const selected = typeof router.query.category === "string" ? router.query.category : "";
  const selectCategory = (name) => {
    const query = { ...router.query };
    if (name) query.category = name;
    else delete query.category;
    router.replace({ pathname: "/", query }, undefined, { shallow: true });
  };

  // ลิงก์จากแชทบอท (/?q=ชื่อยา) -> ใส่คำค้นให้อัตโนมัติ
  useEffect(() => {
    if (typeof router.query.q === "string") setSearch(router.query.q);
  }, [router.query.q]);

  // must be signed in to view the catalog — bounce to /login otherwise
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    Promise.all([api.listMedicines(), api.listCategories()])
      .then(([meds, cats]) => {
        if (!isMounted) return;
        setMedicines(meds);
        setCategories(cats);
      })
      .catch((err) => isMounted && setError(err.message))
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const visible = useMemo(
    () =>
      medicines.filter((m) => (!selected || m.category === selected) && matches(m, search)),
    [medicines, selected, search]
  );

  // จัดกลุ่มตามหมวดหมู่ (ตอนเลือก "ทั้งหมด") โดยคงลำดับหมวดจาก backend
  const groups = useMemo(() => {
    const byName = new Map();
    for (const med of visible) {
      if (!byName.has(med.category)) byName.set(med.category, []);
      byName.get(med.category).push(med);
    }
    return categories
      .filter((c) => byName.has(c.name))
      .map((c) => ({ name: c.name, items: byName.get(c.name) }));
  }, [visible, categories]);

  // while checking auth, or about to redirect — render nothing
  if (authLoading || !isAuthenticated) {
    return null;
  }

  const chipBase =
    "border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition";
  const chipOn = "border-leaf bg-leaf text-surface";
  const chipOff = "border-line-strong bg-surface text-ink hover:border-leaf";

  return (
    <div>
      <section className="mb-10 border-b border-line pb-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Entry 001 — the cabinet
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Dispensed with precision.
          <br />
          Every last dose.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          A curated selection of medicine and supplements, with prescription
          verification for controlled items.
        </p>
      </section>

      {loading && (
        <p className="py-16 text-center font-mono text-xs uppercase tracking-[0.08em] text-muted">
          Loading catalog...
        </p>
      )}

      {error && (
        <p className="py-16 text-center text-sm text-ink">
          Something went wrong: {error}
          <br />
          <span className="text-muted">Check that the backend is running at {API_URL}</span>
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <select
              value={selected}
              onChange={(e) => selectCategory(e.target.value)}
              aria-label="Category"
              className="border border-line-strong bg-surface px-3 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink outline-none focus:border-ink sm:hidden"
            >
              <option value="">All categories ({medicines.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.medicine_count})
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name (English / ไทย) or indication"
              aria-label="Search medicines"
              className="w-full border border-line-strong bg-surface px-3.5 py-2 text-sm text-ink outline-none focus:border-ink sm:max-w-sm"
            />
          </div>

          <nav className="mb-10 hidden flex-wrap gap-2 sm:flex" aria-label="Categories">
            <button
              onClick={() => selectCategory("")}
              className={`${chipBase} ${!selected ? chipOn : chipOff}`}
            >
              All <span className={!selected ? "" : "text-muted"}>{medicines.length}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCategory(c.name)}
                className={`${chipBase} ${selected === c.name ? chipOn : chipOff}`}
              >
                {c.name}{" "}
                <span className={selected === c.name ? "" : "text-muted"}>{c.medicine_count}</span>
              </button>
            ))}
          </nav>

          <p className="mb-6 font-mono text-xs uppercase tracking-[0.08em] text-leaf">
            {visible.length} medicine{visible.length === 1 ? "" : "s"}
            {selected ? ` · ${selected}` : ` · ${groups.length} categories`}
            {search ? ` · "${search}"` : ""}
          </p>

          {visible.length === 0 && (
            <p className="border border-line py-16 text-center font-mono text-xs uppercase tracking-[0.08em] text-muted">
              No medicines match
            </p>
          )}

          {groups.map((g) => (
            <section key={g.name} className="mb-14">
              {!selected && (
                <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-2">
                  <h2 className="font-display text-2xl font-semibold text-ink">{g.name}</h2>
                  <span className="font-mono text-xs text-leaf">{g.items.length}</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((med) => (
                  <MedicineCard key={med.id} medicine={med} onAddToCart={addToCart} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
