import { Shell } from "@log-shield/ui-core";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const demo = [
  { name: "Minggu 1", stok: 120 },
  { name: "Minggu 2", stok: 98 },
  { name: "Minggu 3", stok: 140 },
];

export default function App() {
  return (
    <Shell title="Log-Shield — Dashboard Koordinator">
      <div className="h-64 w-full rounded-xl border border-slate-800 bg-slate-900/50 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={demo}>
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
              }}
            />
            <Bar dataKey="stok" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Placeholder Recharts — sambungkan ke API / CouchDB lewat TanStack Query.
      </p>
    </Shell>
  );
}
