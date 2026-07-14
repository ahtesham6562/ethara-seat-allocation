// Base URL: empty string -> uses Vite dev proxy (/api). In prod set VITE_API_URL.
const RAW = import.meta.env.VITE_API_URL ?? "";
const BASE = RAW ? RAW.replace(/\/$/, "") : "/api";

function token() {
  return localStorage.getItem("ethara_token");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // auth
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  // dashboard
  summary: () => request("/dashboard/summary"),
  projectUtil: () => request("/dashboard/project-utilization"),
  floorUtil: () => request("/dashboard/floor-utilization"),

  // employees
  employees: (params = {}) =>
    request(`/employees?${new URLSearchParams(clean(params))}`),
  employee: (id) => request(`/employees/${id}`),
  createEmployee: (body) =>
    request("/employees", { method: "POST", body, auth: true }),

  // projects
  projects: () => request("/projects"),

  // seats
  seats: (params = {}) => request(`/seats?${new URLSearchParams(clean(params))}`),
  availableSeats: (params = {}) =>
    request(`/seats/available?${new URLSearchParams(clean(params))}`),
  allocate: (body) =>
    request("/seats/allocate", { method: "POST", body, auth: true }),
  release: (body) =>
    request("/seats/release", { method: "POST", body, auth: true }),

  // ai
  aiQuery: (query) => request("/ai/query", { method: "POST", body: { query } }),
};

function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v != null)
  );
}
