export default function StatCard({ icon: Icon, label, value, sub, accent = "indigo", testid }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className={`h-9 w-9 rounded-lg grid place-items-center ${colors[accent]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="mt-3 font-display font-extrabold text-2xl text-slate-900 tabular">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
