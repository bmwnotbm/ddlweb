import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { api, API_URL } from "../lib/api";
import PharmacyCross from "../components/PharmacyCross";

const STATUS_STYLE = {
  Verified: "border-ink bg-ink text-paper",
  Pending: "border-line-strong text-muted",
  Rejected: "border-ink text-ink",
};

export default function PrescriptionsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, token } = useAuth();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [doctorName, setDoctorName] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .listPrescriptions(token)
      .then(setPrescriptions)
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [isAuthenticated, token]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please attach a photo or PDF of your prescription");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("doctor_name", doctorName);
      formData.append("file", file);

      const created = await api.submitPrescription(formData, token);
      setPrescriptions((prev) => [created, ...prev]);
      setDoctorName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Entry 007 — controlled items
        </p>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          Prescriptions
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Some items in the catalog are prescription-only. Attach a photo or
          PDF of your prescription below — once verified, you&apos;ll be able
          to order those items.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 border border-line bg-surface p-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Prescribing doctor (optional)
          </span>
          <input
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="e.g. Dr. Anan Suksawat"
            className="w-full border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Prescription file (image or PDF, max 5MB)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="w-full border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:tracking-[0.06em] file:text-paper focus:border-ink"
          />
        </label>

        {error && (
          <p className="border border-ink px-3 py-2 text-xs text-ink">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full border border-ink bg-ink py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Uploading..." : "Submit prescription"}
        </button>
      </form>

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink">
          Your submissions
        </h2>

        {loadingList ? (
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Loading...
          </p>
        ) : prescriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border border-line py-10 text-muted">
            <PharmacyCross />
            <p className="font-mono text-xs uppercase tracking-[0.08em]">
              No prescriptions submitted yet
            </p>
          </div>
        ) : (
          <div className="border border-line bg-surface">
            {prescriptions.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-5 py-3 ${
                  i === prescriptions.length - 1 ? "" : "border-b border-line"
                }`}
              >
                <div>
                  <p className="text-sm text-ink">{p.doctor_name || "—"}</p>
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
                <span
                  className={`shrink-0 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${STATUS_STYLE[p.status] || "border-line-strong text-muted"}`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
