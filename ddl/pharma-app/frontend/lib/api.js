const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * ยิง request ไปยัง Backend
 * แนบ Authorization: Bearer <token> ให้อัตโนมัติถ้ามี token ส่งเข้ามา
 */
async function request(path, { method = "GET", body, token, isFormData = false } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // FastAPI ส่ง error กลับมาในรูป { detail: "..." } หรือ { detail: [...] } (validation error)
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(", ")
      : detail || "Something went wrong, please try again";
    throw new Error(message);
  }

  return data;
}

export const api = {
  register: (payload) => request("/register", { method: "POST", body: payload }),
  login: (payload) => request("/login", { method: "POST", body: payload }),
  logout: (token) => request("/logout", { method: "POST", token }),
  me: (token) => request("/me", { token }),
  changePassword: (payload, token) =>
    request("/change-password", { method: "POST", body: payload, token }),
  checkUsername: (username) =>
    request(`/check-username/${encodeURIComponent(username)}`),
  updateUser: (id, payload, token) =>
    request(`/users/${id}`, { method: "PUT", body: payload, token }),
  createOrder: (payload, token) =>
    request("/orders", { method: "POST", body: payload, token }),
  payOrder: (orderId, payload, token) =>
    request(`/orders/${orderId}/pay`, { method: "POST", body: payload, token }),
  listOrders: (token, all = false) =>
    request(`/orders${all ? "?all=true" : ""}`, { token }),
  updateShipment: (orderId, payload, token) =>
    request(`/orders/${orderId}/shipment`, { method: "PUT", body: payload, token }),
  submitPrescription: (formData, token) =>
    request("/prescriptions", { method: "POST", body: formData, token, isFormData: true }),
  listPrescriptions: (token, all = false) =>
    request(`/prescriptions${all ? "?all=true" : ""}`, { token }),
  reviewPrescription: (id, payload, token) =>
    request(`/prescriptions/${id}/review`, { method: "PUT", body: payload, token }),
  listCategories: () => request("/categories"),
  listMedicines: (category) =>
    request(`/medicines${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  createMedicine: (payload, token) =>
    request("/medicines", { method: "POST", body: payload, token }),
  updateMedicine: (id, payload, token) =>
    request(`/medicines/${id}`, { method: "PUT", body: payload, token }),
  deleteMedicine: (id, token) => request(`/medicines/${id}`, { method: "DELETE", token }),
  listUsers: (token, page = 1, pageSize = 100) =>
    request(`/users?page=${page}&page_size=${pageSize}`, { token }),
  cancelOrder: (orderId, token) => request(`/orders/${orderId}`, { method: "DELETE", token }),
  checkInteractions: (medicineIds) =>
    request("/medicines/check-interactions", {
      method: "POST",
      body: { medicine_ids: medicineIds },
    }),
};

export { API_URL };
