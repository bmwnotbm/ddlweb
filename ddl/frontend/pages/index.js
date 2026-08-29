import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import MedicineCard from "../components/MedicineCard";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addToCart } = useCart();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // must be signed in to view the catalog — bounce to /login otherwise
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    async function fetchMedicines() {
      try {
        const res = await fetch(`${API_URL}/medicines`);
        if (!res.ok) throw new Error("Failed to load the catalog");
        const data = await res.json();
        if (isMounted) setMedicines(data);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchMedicines();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // while checking auth, or about to redirect — render nothing
  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div>
      <section className="mb-14 border-b border-line pb-10">
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
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {medicines.map((med) => (
            <MedicineCard key={med.id} medicine={med} onAddToCart={addToCart} />
          ))}
        </div>
      )}
    </div>
  );
}
