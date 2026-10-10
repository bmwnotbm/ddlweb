import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        Entry 003 — sign in
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
        Welcome back
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 border border-line bg-surface p-6">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Username
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            className="w-full border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-line-strong bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        {error && (
          <p className="border border-ink px-3 py-2 text-xs text-ink">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full border border-ink bg-ink py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        No account yet?{" "}
        <Link href="/register" className="text-ink underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}
