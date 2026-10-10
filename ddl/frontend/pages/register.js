import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        full_name: form.full_name || undefined,
      });
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
        Entry 004 — new member
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
        Create an account
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 border border-line bg-surface p-6">
        <Field label="Username">
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={50}
            placeholder="e.g. jane_doe"
            className="input"
          />
        </Field>

        <Field label="Full name (optional)">
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="e.g. Jane Doe"
            className="input"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="you@example.com"
            className="input"
          />
        </Field>

        <Field label="Password (min. 8 characters)">
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="input"
          />
        </Field>

        <Field label="Confirm password">
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            minLength={8}
            className="input"
          />
        </Field>

        {error && (
          <p className="border border-ink px-3 py-2 text-xs text-ink">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full border border-ink bg-ink py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #a5c2b0;
          background-color: #f1f7f3;
          padding: 0.55rem 0.85rem;
          font-size: 0.9rem;
          color: #0f3d2a;
          outline: none;
        }
        .input:focus {
          border-color: #1e8e5a;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
