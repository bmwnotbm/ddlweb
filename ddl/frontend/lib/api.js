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
  listOrders: (token) => request("/orders", { token }),
  submitPrescription: (formData, token) =>
    request("/prescriptions", { method: "POST", body: formData, token, isFormData: true }),
  listPrescriptions: (token) => request("/prescriptions", { token }),
};

export { API_URL };
