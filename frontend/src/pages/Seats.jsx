import { useEffect, useState } from "react";
import { api } from "../api";

const statusColor = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-brand-50 text-brand-700",
  reserved: "bg-amber-100 text-amber-700",
  maintenance: "bg-red-100 text-red-700",
};

export default function Seats() {
  const [filters, setFilters] = useState({ floor: "", zone: "", status: "" });
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  function load(p = page) {
    setLoading(true);
    api
      .seats({ ...filters, page: p, limit: 50 })
      .then((d) => {
        setData(d);
        setPage(d.page);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Seats</h1>

      <div className="card grid md:grid-cols-4 gap-3">
        <select className="input" value={filters.floor} onChange={(e) => setFilters({ ...filters, floor: e.target.value })}>
          <option value="">All floors</option>
          {[1, 2, 3, 4, 5].map((f) => (
            <option key={f} value={f}>Floor {f}</option>
          ))}
        </select>
        <input className="input" placeholder="Zone (A-J)" value={filters.zone} onChange={(e) => setFilters({ ...filters, zone: e.target.value.toUpperCase() })} />
        <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <div className="text-sm text-gray-500 flex items-center">
          {data.total.toLocaleString()} seats
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Seat</th>
              <th className="px-4 py-3">Floor</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Bay</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Occupant</th>
              <th className="px-4 py-3">Project</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((s) => (
              <tr key={s._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{s.seat_number}</td>
                <td className="px-4 py-3">{s.floor}</td>
                <td className="px-4 py-3">{s.zone}</td>
                <td className="px-4 py-3">{s.bay}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor[s.status]}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3">{s.allocated_employee?.name || "—"}</td>
                <td className="px-4 py-3">{s.allocated_project?.name || "—"}</td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-400">No seats found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Page {data.page} of {data.pages}</span>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
          <button className="btn-ghost" disabled={page >= data.pages} onClick={() => load(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
