import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwMessage("");
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMessage("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !user) {
    return <p className="text-center font-mono text-xs uppercase tracking-[0.08em] text-muted">Loading...</p>;
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Entry 005 — account
        </p>
        <h1 className="mb-6 font-display text-3xl font-semibold text-ink">
          Profile
        </h1>

        <dl className="border border-line bg-surface">
          <Row label="Username" value={user.username} />
          <Row label="Full name" value={user.full_name || "—"} />
          <Row label="Email" value={user.email} />
          <Row label="Status" value={user.is_active ? "Active" : "Suspended"} />
          <Row label="Role" value={user.is_admin ? "Administrator" : "Member"} last />
        </dl>

        <button
          onClick={handleLogout}
          className="mt-4 w-full border border-ink py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
        >
          Sign out
        </button>
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink">Change password</h2>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-5 border border-line bg-surface p-6">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
              Current password
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
              New password (min. 8 characters)
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </label>

          {pwError && (
            <p className="border border-ink px-3 py-2 text-xs text-ink">{pwError}</p>
          )}
          {pwMessage && (
            <p className="border border-ink bg-ink px-3 py-2 text-xs text-paper">{pwMessage}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-ink bg-ink py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 ${last ? "" : "border-b border-line"}`}>
      <dt className="font-mono text-xs uppercase tracking-[0.06em] text-muted">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}
