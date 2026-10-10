import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import CartItem from "../components/CartItem";
import PharmacyCross from "../components/PharmacyCross";

const PAYMENT_METHODS = ["Credit Card", "PromptPay", "Bank Transfer"];

export default function Cart() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, token } = useAuth();
  const { items, updateQty, removeFromCart, totalPrice, requiresPrescription, clearCart } =
    useCart();

  const [step, setStep] = useState("cart"); // cart -> payment -> success
  const [shippingAddress, setShippingAddress] = useState("");
  const [order, setOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // เช็คยาตีกันทุกครั้งที่รายการในตะกร้าเปลี่ยน (แค่เตือน ไม่บล็อกการสั่งซื้อ)
  useEffect(() => {
    if (items.length < 2) {
      setInteractions([]);
      return;
    }
    api
      .checkInteractions(items.map((i) => i.id))
      .then(setInteractions)
      .catch(() => {});
  }, [items]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const created = await api.createOrder(
        {
          items: items.map((i) => ({ medicine_id: i.id, quantity: i.qty })),
          shipping_address: shippingAddress,
        },
        token
      );
      setOrder(created);
      setStep("payment");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    setError("");
    setSubmitting(true);
    try {
      const paid = await api.payOrder(order.id, { payment_method: paymentMethod }, token);
      setOrder(paid);
      clearCart();
      setStep("success");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Step 3: success ----------
  if (step === "success" && order) {
    return (
      <div className="mx-auto max-w-sm border border-line bg-surface p-8 text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Entry 006 — confirmed
        </p>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          Order placed
        </h1>
        <p className="mb-6 text-sm text-muted">
          Order #{order.id} — ${order.total_amount.toFixed(2)} — {order.status}
        </p>
        <Link
          href="/"
          className="inline-block border border-ink bg-ink px-6 py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-paper hover:bg-paper hover:text-ink"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  // ---------- Step 2: payment ----------
  if (step === "payment" && order) {
    return (
      <div className="mx-auto max-w-sm">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Entry 006 — payment
        </p>
        <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
          Pay for your order
        </h1>

        <div className="border border-line bg-surface p-6">
          <div className="mb-5 flex justify-between border-b border-line pb-4 font-mono text-sm text-ink">
            <span className="text-muted">Order #{order.id}</span>
            <span>${order.total_amount.toFixed(2)}</span>
          </div>

          <p className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-muted">
            Payment method
          </p>
          <div className="mb-6 flex flex-col gap-2">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method}
                className={`flex cursor-pointer items-center gap-3 border px-4 py-2.5 text-sm ${
                  paymentMethod === method
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong text-ink hover:border-ink"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  className="accent-black"
                />
                {method}
              </label>
            ))}
          </div>

          {error && (
            <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{error}</p>
          )}

          <button
            onClick={handlePay}
            disabled={submitting}
            className="w-full border border-ink bg-ink py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Processing..." : `Pay $${order.total_amount.toFixed(2)}`}
          </button>

          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
            Simulated payment — no real charge is made
          </p>
        </div>
      </div>
    );
  }

  // ---------- Step 1: cart ----------
  return (
    <div>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        Entry 002 — your order
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">Cart</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-line py-16 text-muted">
          <PharmacyCross />
          <p className="font-mono text-xs uppercase tracking-[0.08em]">Your cart is empty</p>
        </div>
      ) : (
        <form onSubmit={handlePlaceOrder} className="grid gap-px bg-line lg:grid-cols-3">
          <div className="bg-surface p-4 lg:col-span-2">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
              />
            ))}
          </div>

          <div className="h-fit bg-surface p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Order summary
            </h2>

            <div className="mb-4 flex justify-between border-b border-line pb-4 font-mono text-sm text-ink">
              <span className="text-muted">Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>

            <label className="mb-4 flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
                Shipping address
              </span>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
                rows={2}
                placeholder="Street, city, postal code"
                className="w-full resize-none border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>

            {interactions.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {interactions.map((w, i) => (
                  <p
                    key={i}
                    className={`border p-3 text-xs leading-relaxed ${
                      w.severity === "warning"
                        ? "border-ink bg-ink text-paper"
                        : "border-ink text-ink"
                    }`}
                  >
                    <span className="font-mono uppercase tracking-[0.06em]">
                      ℞ {w.severity === "warning" ? "Warning" : "Caution"}:
                    </span>{" "}
                    {w.medicine_a} + {w.medicine_b} — {w.message}
                  </p>
                ))}
                <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  Not a substitute for professional advice. Ask your pharmacist.
                </p>
              </div>
            )}

            {requiresPrescription && (
              <p className="mb-4 border border-ink p-3 text-xs leading-relaxed text-ink">
                Your cart contains a prescription-only item. You&apos;ll need a
                verified prescription on file to complete this order.{" "}
                <Link href="/prescriptions" className="underline underline-offset-2">
                  Submit one here
                </Link>
                .
              </p>
            )}

            {error && (
              <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full border border-ink bg-ink py-3 font-mono text-xs uppercase tracking-[0.08em] text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
