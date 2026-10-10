import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function UsersPanel({ token, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api
      .listUsers(token)
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleActive = async (u) => {
    setBusyId(u.id);
    setError("");
    try {
      const updated = await api.updateUser(u.id, { is_active: !u.is_active }, token);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Loading...</p>;
  }

  return (
    <div>
      {error && <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{error}</p>}
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-leaf">
        {total} user{total === 1 ? "" : "s"}
        {total > users.length ? ` (showing first ${users.length})` : ""}
      </p>
      <div className="border border-line bg-surface">
        {users.map((u, i) => (
          <div
            key={u.id}
            className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
              i === users.length - 1 ? "" : "border-b border-line"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">
                {u.username}
                {u.is_admin && (
                  <span className="ml-2 border border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]">
                    Admin
                  </span>
                )}
              </p>
              <p className="truncate font-mono text-[11px] text-muted">
                {u.full_name ? `${u.full_name} · ` : ""}
                {u.email} · joined {u.created_at.slice(0, 10)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-[11px] uppercase tracking-[0.06em] ${
                  u.is_active ? "text-leaf" : "text-muted"
                }`}
              >
                {u.is_active ? "Active" : "Suspended"}
              </span>
              <button
                onClick={() => toggleActive(u)}
                disabled={busyId === u.id || u.id === currentUserId}
                title={u.id === currentUserId ? "You can't suspend your own account" : undefined}
                className="border border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {u.is_active ? "Suspend" : "Reactivate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
