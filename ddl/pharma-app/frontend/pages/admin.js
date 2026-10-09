import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { api, API_URL } from "../lib/api";
import PharmacyCross from "../components/PharmacyCross";
import MedicinesPanel from "../components/admin/MedicinesPanel";
import UsersPanel from "../components/admin/UsersPanel";

const RX_STATUS_STYLE = {
  Verified: "border-ink bg-ink text-paper",
  Pending: "border-line-strong text-muted",
  Rejected: "border-ink text-ink",
};

const SHIPMENT_STATUSES = ["Preparing", "Shipped", "Delivered"];

function isImageFile(url) {
  return /\.(jpe?g|png|webp)$/i.test(url || "");
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, token } = useAuth();

  const [tab, setTab] = useState("prescriptions"); // prescriptions | orders | medicines | users

  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [rxError, setRxError] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [shipmentDrafts, setShipmentDrafts] = useState({}); // orderId -> { status, tracking_number }
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const isAdmin = !!user?.is_admin;

  useEffect(() => {
    if (!isAdmin) return;
    api
      .listPrescriptions(token, true)
      .then(setPrescriptions)
      .catch((err) => setRxError(err.message))
      .finally(() => setLoadingRx(false));
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .listOrders(token, true)
      .then((res) => setOrders(res.items))
      .catch((err) => setOrdersError(err.message))
      .finally(() => setLoadingOrders(false));
  }, [isAdmin, token]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-sm border border-line bg-surface p-8 text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          Entry 008 — restricted
        </p>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
          Admins only
        </h1>
        <p className="text-sm text-muted">
          Your account doesn&apos;t have administrator access.
        </p>
      </div>
    );
  }

  const handleReview = async (id, status) => {
    setReviewingId(id);
    setRxError("");
    try {
      const updated = await api.reviewPrescription(id, { status }, token);
      setPrescriptions((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setRxError(err.message);
    } finally {
      setReviewingId(null);
    }
  };

  const draftFor = (order) =>
    shipmentDrafts[order.id] || {
      status: order.shipment?.status || "Preparing",
      tracking_number: order.shipment?.tracking_number || "",
    };

  const setDraft = (orderId, patch) => {
    setShipmentDrafts((prev) => ({
      ...prev,
      [orderId]: { ...draftFor({ id: orderId, shipment: prev[orderId] }), ...patch },
    }));
  };

  const handleUpdateShipment = async (order) => {
    const draft = draftFor(order);
    setUpdatingOrderId(order.id);
    setOrdersError("");
    try {
      const updated = await api.updateShipment(
        order.id,
        { status: draft.status, tracking_number: draft.tracking_number || null },
        token
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err) {
      setOrdersError(err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const pendingCount = prescriptions.filter((p) => p.status === "Pending").length;

  return (
    <div>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        Entry 008 — administration
      </p>
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
        Admin dashboard
      </h1>

      <div className="mb-8 flex flex-wrap gap-px bg-line">
        {[
          ["prescriptions", `Prescriptions${pendingCount > 0 ? ` (${pendingCount})` : ""}`],
          ["orders", "Orders"],
          ["medicines", "Medicines"],
          ["users", "Users"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-w-[8rem] flex-1 py-3 font-mono text-xs uppercase tracking-[0.08em] transition ${
              tab === key ? "bg-ink text-paper" : "bg-surface text-ink hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "prescriptions" && (
        <div>
          {rxError && (
            <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{rxError}</p>
          )}

          {loadingRx ? (
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
              Loading...
            </p>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border border-line py-16 text-muted">
              <PharmacyCross />
              <p className="font-mono text-xs uppercase tracking-[0.08em]">No prescriptions submitted yet</p>
            </div>
          ) : (
            <div className="grid gap-px bg-line sm:grid-cols-2">
              {prescriptions.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 bg-surface p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-ink">
                        {p.doctor_name || "No doctor name given"}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        Customer #{p.customer_id} — {p.prescription_date}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${RX_STATUS_STYLE[p.status] || "border-line-strong text-muted"}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {p.file_url &&
                    (isImageFile(p.file_url) ? (
                      <a href={`${API_URL}${p.file_url}`} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${API_URL}${p.file_url}`}
                          alt="Prescription"
                          className="h-40 w-full border border-line object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        href={`${API_URL}${p.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-line-strong py-6 text-center font-mono text-xs uppercase tracking-[0.06em] text-ink underline underline-offset-2"
                      >
                        View PDF
                      </a>
                    ))}

                  {p.status === "Pending" && (
                    <div className="flex gap-px bg-line">
                      <button
                        onClick={() => handleReview(p.id, "Verified")}
                        disabled={reviewingId === p.id}
                        className="flex-1 bg-ink py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:opacity-80 disabled:opacity-50"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleReview(p.id, "Rejected")}
                        disabled={reviewingId === p.id}
                        className="flex-1 bg-surface py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:bg-paper disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div>
          {ordersError && (
            <p className="mb-4 border border-ink px-3 py-2 text-xs text-ink">{ordersError}</p>
          )}

          {loadingOrders ? (
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
              Loading...
            </p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border border-line py-16 text-muted">
              <PharmacyCross />
              <p className="font-mono text-xs uppercase tracking-[0.08em]">No orders yet</p>
            </div>
          ) : (
            <div className="border border-line bg-surface">
              {orders.map((order, i) => {
                const draft = draftFor(order);
                return (
                  <div
                    key={order.id}
                    className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${
                      i === orders.length - 1 ? "" : "border-b border-line"
                    }`}
                  >
                    <div>
                      <p className="text-sm text-ink">
                        Order #{order.id} — Customer #{order.customer_id}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {order.order_date} — ${order.total_amount.toFixed(2)} — {order.status}
                      </p>
                      {order.shipment && (
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          {order.shipment.shipping_address}
                        </p>
                      )}
                    </div>

                    {order.shipment && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={draft.status}
                          onChange={(e) => setDraft(order.id, { status: e.target.value })}
                          className="border border-line-strong bg-paper px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-ink outline-none focus:border-ink"
                        >
                          {SHIPMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <input
                          value={draft.tracking_number}
                          onChange={(e) => setDraft(order.id, { tracking_number: e.target.value })}
                          placeholder="Tracking #"
                          className="w-28 border border-line-strong bg-paper px-2 py-1.5 font-mono text-[11px] text-ink outline-none focus:border-ink"
                        />
                        <button
                          onClick={() => handleUpdateShipment(order)}
                          disabled={updatingOrderId === order.id}
                          className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:bg-paper hover:text-ink disabled:opacity-50"
                        >
                          Update
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "medicines" && <MedicinesPanel token={token} />}
      {tab === "users" && <UsersPanel token={token} currentUserId={user.id} />}
    </div>
  );
}
