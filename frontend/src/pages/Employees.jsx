import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";

const statusBadge = {
  allocated: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
};

export default function Employees() {
  const { canWrite } = useAuth();
  const [filters, setFilters] = useState({ search: "", project: "", status: "" });
  const [projects, setProjects] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.projects().then(setProjects).catch(() => {});
  }, []);

  function load(p = page) {
    setLoading(true);
    api
      .employees({ ...filters, page: p, limit: 20 })
      .then((d) => {
        setData(d);
        setPage(d.page);
      })
      .catch((e) => setMsg({ type: "err", text: e.message }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function allocate(emp) {
    setMsg(null);
    try {
      const r = await api.allocate({ employeeId: emp._id });
      setMsg({
        type: "ok",
        text: `Allocated ${emp.name} -> Floor ${r.seat.floor}, Zone ${r.seat.zone}, Seat ${r.seat.seat_number}`,
      });
      load();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function release(emp) {
    setMsg(null);
    try {
      await api.release({ employeeId: emp._id });
      setMsg({ type: "ok", text: `Released seat for ${emp.name}` });
      load();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + New Joiner
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card grid md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Search name / email / code"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="input"
          value={filters.project}
          onChange={(e) => setFilters({ ...filters, project: e.target.value })}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="new_joiner">New joiner</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="text-sm text-gray-500 flex items-center">
          {data.total.toLocaleString()} results
        </div>
      </div>

      {msg && (
        <div
          className={`text-sm px-4 py-2 rounded-lg ${
            msg.type === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Seat</th>
              {canWrite && <th className="px-4 py-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((e) => (
              <tr key={e._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{e.employee_code}</td>
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 text-gray-500">{e.email}</td>
                <td className="px-4 py-3">{e.project?.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-gray-100 text-gray-600">{e.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${statusBadge[e.seat_allocation_status]}`}
                  >
                    {e.seat_allocation_status}
                  </span>
                </td>
                {canWrite && (
                  <td className="px-4 py-3">
                    {e.seat_allocation_status === "pending" ? (
                      <button
                        className="btn-primary text-xs py-1"
                        onClick={() => allocate(e)}
                      >
                        Allocate
                      </button>
                    ) : (
                      <button
                        className="btn-ghost text-xs py-1"
                        onClick={() => release(e)}
                      >
                        Release
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Page {data.page} of {data.pages}
        </span>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >
            Prev
          </button>
          <button
            className="btn-ghost"
            disabled={page >= data.pages}
            onClick={() => load(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {showAdd && (
        <AddEmployeeModal
          projects={projects}
          onClose={() => setShowAdd(false)}
          onCreated={(text) => {
            setShowAdd(false);
            setMsg({ type: "ok", text });
            load(1);
          }}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ projects, onClose, onCreated }) {
  const [form, setForm] = useState({
    employee_code: "",
    name: "",
    email: "",
    department: "Engineering",
    role: "Engineer",
    project: projects[0]?._id || "",
    status: "new_joiner",
  });
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const emp = await api.createEmployee(form);
      let text = `Created ${emp.name}`;
      if (autoAllocate) {
        const r = await api.allocate({ employeeId: emp._id });
        text += ` and allocated Seat ${r.seat.seat_number} (Floor ${r.seat.floor}, Zone ${r.seat.zone})`;
      }
      onCreated(text);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-20">
      <div className="card w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">Add New Joiner</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Employee code" value={form.employee_code} onChange={set("employee_code")} required />
          <input className="input" placeholder="Full name" value={form.name} onChange={set("name")} required />
          <input className="input col-span-2" placeholder="Email" type="email" value={form.email} onChange={set("email")} required />
          <input className="input" placeholder="Department" value={form.department} onChange={set("department")} />
          <input className="input" placeholder="Role" value={form.role} onChange={set("role")} />
          <select className="input col-span-2" value={form.project} onChange={set("project")}>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={autoAllocate} onChange={(e) => setAutoAllocate(e.target.checked)} />
            Auto-allocate nearest available seat to their project team
          </label>
          {err && <p className="col-span-2 text-red-600 text-sm">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
