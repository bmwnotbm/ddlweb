import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";
import { api, API_URL } from "../../lib/api";

const STATUS_STYLE = {
  Verified: "border-ink bg-ink text-paper",
  Pending: "border-line-strong text-muted",
  Rejected: "border-ink text-ink",
};

export default function AdminPrescriptionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, token } = useAuth();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [filter, setFilter] = useState("Pending");

  // กันคนที่ไม่ใช่แอดมินเข้าหน้านี้ — รอ auth โหลดเสร็จก่อนค่อยเช็ค
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!user?.is_admin) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  const loadPrescriptions = () => {
    setLoadingList(true);
    setError("");
    api
      .listPrescriptions(token, true)
      .then(setPrescriptions)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) return;
    loadPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, token]);

  if (authLoading || !isAuthenticated || !user?.is_admin) {
    return null;
  }

  const handleReview = async (id, status) => {
    setActioningId(id);
    setError("");
    try {
      const updated = await api.reviewPrescription(id, status, token);
      setPrescriptions((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const visible = prescriptions.filter((p) =>
    filter === "All" ? true : p.status === filter,
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Admin — controlled items
        </p>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          Review prescriptions
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Approve or reject prescriptions customers have submitted. Verified
          prescriptions unlock prescription-only items for that customer.
        </p>
      </div>

      <div className="flex gap-2">
        {["Pending", "Verified", "Rejected", "All"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] transition ${
              filter === s
                ? "border-ink bg-ink text-paper"
                : "border-line-strong text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p className="border border-ink px-3 py-2 text-xs text-ink">{error}</p>
      )}

      {loadingList ? (
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
          Loading...
        </p>
      ) : visible.length === 0 ? (
        <p className="border border-line py-10 text-center font-mono text-xs uppercase tracking-[0.08em] text-muted">
          No prescriptions in this view
        </p>
      ) : (
        <div className="border border-line bg-surface">
          {visible.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                i === visible.length - 1 ? "" : "border-b border-line"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  Customer #{p.customer_id}
                  {p.doctor_name ? ` — ${p.doctor_name}` : ""}
                </p>
                <p className="font-mono text-[11px] text-muted">
                  {p.prescription_date}
                </p>
                {p.file_url && (
                  <a
                    href={`${API_URL}${p.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink underline underline-offset-2"
                  >
                    View file
                  </a>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${STATUS_STYLE[p.status] || "border-line-strong text-muted"}`}
                >
                  {p.status}
                </span>

                {p.status === "Pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(p.id, "Verified")}
                      disabled={actioningId === p.id}
                      className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(p.id, "Rejected")}
                      disabled={actioningId === p.id}
                      className="border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink transition hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
