import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import PharmacyCross from "../components/PharmacyCross";

const PAYMENT_METHODS = ["Credit Card", "PromptPay", "Bank Transfer"];

const STATUS_STYLE = {
  "Pending Payment": "border-line-strong text-muted",
  Paid: "border-leaf text-leaf",
  Shipped: "border-ink text-ink",
  Delivered: "border-ink bg-ink text-paper",
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [methods, setMethods] = useState({}); // orderId -> payment method

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .listOrders(token)
      .then((res) => setOrders(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, token]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const handlePay = async (order) => {
    setBusyId(order.id);
    setError("");
    try {
      const paid = await api.payOrder(
        order.id,
        { payment_method: methods[order.id] || PAYMENT_METHODS[0] },
        token
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? paid : o)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (order) => {
    if (!window.confirm(`Cancel order #${order.id}?`)) return;
    setBusyId(order.id);
    setError("");
    try {
      await api.cancelOrder(order.id, token);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        Entry 007 — your orders
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">My orders</h1>

      {error && <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{error}</p>}

      {loading ? (
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-line py-16 text-muted">
          <PharmacyCross />
          <p className="font-mono text-xs uppercase tracking-[0.08em]">No orders yet</p>
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.08em] text-ink underline">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-ink">Order #{order.id}</p>
                  <p className="font-mono text-[11px] text-muted">{order.order_date}</p>
                </div>
                <span
                  className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${
                    STATUS_STYLE[order.status] || "border-line-strong text-muted"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <ul className="my-4 border-y border-dashed border-line py-3 text-sm text-ink">
                {order.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-0.5">
                    <span>
                      {it.medicine_name} <span className="text-muted">× {it.quantity}</span>
                    </span>
                    <span className="font-mono">${it.subtotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="font-mono text-[11px] text-muted">
                  {order.shipment && (
                    <>
                      <p>Ship to: {order.shipment.shipping_address}</p>
                      <p>
                        Shipment: {order.shipment.status}
                        {order.shipment.tracking_number
                          ? ` — tracking ${order.shipment.tracking_number}`
                          : ""}
                      </p>
                    </>
                  )}
                  {order.payment && (
                    <p>
                      Paid via {order.payment.payment_method} on {order.payment.payment_date}
                    </p>
                  )}
                </div>
                <p className="font-mono text-lg text-ink">${order.total_amount.toFixed(2)}</p>
              </div>

              {order.status === "Pending Payment" && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <select
                    value={methods[order.id] || PAYMENT_METHODS[0]}
                    onChange={(e) => setMethods((m) => ({ ...m, [order.id]: e.target.value }))}
                    className="border border-line-strong bg-paper px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-ink outline-none focus:border-ink"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handlePay(order)}
                    disabled={busyId === order.id}
                    className="border border-ink bg-ink px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
                  >
                    Pay now
                  </button>
                  <button
                    onClick={() => handleCancel(order)}
                    disabled={busyId === order.id}
                    className="border border-line-strong px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:border-ink disabled:opacity-50"
                  >
                    Cancel order
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
