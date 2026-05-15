import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#60a5fa', fontWeight: 600 }}>{payload[0].value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function ChartView({ data }) {
  if (!data?.length) return null;
  const keys = Object.keys(data[0]);
  const numericKey = keys.find(k => !isNaN(Number(data[0][k])) && data[0][k] !== '');
  const labelKey = keys.find(k => k !== numericKey);
  if (!numericKey || !labelKey) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey={labelKey} angle={-35} textAnchor="end" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
        <Bar dataKey={numericKey} fill="url(#barGrad)" radius={[4, 4, 0, 0]}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}