import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

export default function Header() {
  const { totalItems } = useCart();
  const { user, loading, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="flex items-center gap-6">
          {isAuthenticated && (
            <Link
              href="/prescriptions"
              className="font-mono text-xs uppercase tracking-[0.08em] text-ink hover:text-muted"
            >
              Rx
            </Link>
          )}

          {isAuthenticated && user.is_admin && (
            <Link
              href="/admin/prescriptions"
              className="font-mono text-xs uppercase tracking-[0.08em] text-ink hover:text-muted"
            >
              Admin
            </Link>
          )}

          {isAuthenticated && (
            <Link
              href="/cart"
              className="relative font-mono text-xs uppercase tracking-[0.08em] text-ink hover:text-muted"
            >
              Cart
              {totalItems > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center bg-ink px-1 font-mono text-[11px] text-paper">
                  {totalItems}
                </span>
              )}
            </Link>
          )}

          {loading ? null : isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                href="/me"
                className="font-mono text-xs uppercase tracking-[0.08em] text-ink hover:text-muted"
              >
                {user.username}
              </Link>
              <button
                onClick={logout}
                className="border border-ink px-4 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-ink transition hover:bg-ink hover:text-paper"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="font-mono text-xs uppercase tracking-[0.08em] text-ink hover:text-muted"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="border border-ink bg-ink px-4 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
