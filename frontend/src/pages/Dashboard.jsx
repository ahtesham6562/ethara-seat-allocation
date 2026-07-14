import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "../api";

const SEAT_COLORS = {
  occupied: "#3b6bff",
  available: "#22c55e",
  reserved: "#f59e0b",
  maintenance: "#ef4444",
};

function Stat({ label, value, accent }) {
  return (
    <div className="card">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent || "text-gray-800"}`}>
        {value?.toLocaleString() ?? "—"}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [projectUtil, setProjectUtil] = useState([]);
  const [floorUtil, setFloorUtil] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([api.summary(), api.projectUtil(), api.floorUtil()])
      .then(([s, p, f]) => {
        setSummary(s);
        setProjectUtil(p);
        setFloorUtil(f);
      })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;

  const seatPie = summary
    ? [
        { name: "occupied", value: summary.occupied_seats },
        { name: "available", value: summary.available_seats },
        { name: "reserved", value: summary.reserved_seats },
        { name: "maintenance", value: summary.maintenance_seats },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Employees" value={summary?.total_employees} />
        <Stat label="Total Seats" value={summary?.total_seats} />
        <Stat label="Occupied" value={summary?.occupied_seats} accent="text-brand-600" />
        <Stat label="Available" value={summary?.available_seats} accent="text-green-600" />
        <Stat label="Reserved" value={summary?.reserved_seats} accent="text-amber-600" />
        <Stat label="Maintenance" value={summary?.maintenance_seats} accent="text-red-600" />
        <Stat
          label="Pending Allocation"
          value={summary?.new_joiners_pending_allocation}
          accent="text-purple-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Seat Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={seatPie} dataKey="value" nameKey="name" outerRadius={90} label>
                {seatPie.map((s) => (
                  <Cell key={s.name} fill={SEAT_COLORS[s.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Floor Occupancy</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={floorUtil}>
              <XAxis dataKey="floor" tickFormatter={(f) => `F${f}`} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="occupied" stackId="a" fill="#3b6bff" />
              <Bar dataKey="available" stackId="a" fill="#22c55e" />
              <Bar dataKey="reserved" stackId="a" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Project-wise Seat Allocation</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={projectUtil} margin={{ bottom: 20 }}>
            <XAxis dataKey="project" angle={-25} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="occupied_seats" fill="#3b6bff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
