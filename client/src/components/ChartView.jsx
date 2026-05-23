import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, HistogramChart
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <p style={{ color: '#94a3b8', marginBottom: 4 }}>{String(label)}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#60a5fa', fontWeight: 600 }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartView({ data, chartType = 'auto' }) {
  if (!data || data.length === 0) return null;

  // Clean and prepare data
  const keys = Object.keys(data[0]);

  // Find numeric and label columns
  const numericKeys = keys.filter(k => {
    const val = data[0][k];
    return val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
  });

  const labelKeys = keys.filter(k => !numericKeys.includes(k));

  // Need at least one numeric column
  if (numericKeys.length === 0) {
    // All columns are text — show value counts of first column
    const col = keys[0];
    const counts = {};
    data.forEach(row => {
      const val = String(row[col] ?? 'Unknown');
      counts[val] = (counts[val] || 0) + 1;
    });
    const chartData = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, count: value }));

    return (
      <div>
        <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
          Distribution of <strong style={{ color: '#94a3b8' }}>{col}</strong> ({chartData.length} unique values shown)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" angle={-40} textAnchor="end" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <rect key={i} fill={`hsl(${220 + i * 15}, 70%, ${50 + i * 2}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Prepare chart data — convert all numeric values
  const cleanData = data.slice(0, 50).map(row => {
    const cleaned = {};
    keys.forEach(k => {
      const val = row[k];
      if (numericKeys.includes(k)) {
        cleaned[k] = val === null || val === undefined || val === '' ? 0 : Number(val);
      } else {
        cleaned[k] = String(val ?? '');
      }
    });
    return cleaned;
  });

  const labelKey = labelKeys[0] || keys[0];
  const colors = ['#3b82f6', '#8b5cf6', '#34d399', '#fbbf24', '#f87171', '#06b6d4'];

  // Histogram: if only 1 numeric column and no label column
  if (numericKeys.length === 1 && labelKeys.length === 0) {
    const col = numericKeys[0];
    const values = data.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const binSize = (max - min) / binCount || 1;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}`,
      count: 0,
      from: min + i * binSize,
      to: min + (i + 1) * binSize
    }));

    values.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / binSize), binCount - 1);
      if (bins[idx]) bins[idx].count++;
    });

    return (
      <div>
        <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
          Histogram of <strong style={{ color: '#94a3b8' }}>{col}</strong>
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={bins} margin={{ top: 4, right: 4, left: 0, bottom: 40 }} barCategoryGap="2%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="range" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
            <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Multiple numeric columns — grouped bar chart
  if (numericKeys.length > 1) {
    return (
      <div>
        <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
          Comparing <strong style={{ color: '#94a3b8' }}>{numericKeys.slice(0, 4).join(', ')}</strong>
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={cleanData} margin={{ top: 4, right: 4, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey={labelKey} angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#4b5563', paddingTop: 8 }} />
            {numericKeys.slice(0, 4).map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default: single numeric, single label — simple bar chart
  const numKey = numericKeys[0];

  return (
    <div>
      <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
        <strong style={{ color: '#94a3b8' }}>{numKey}</strong> by <strong style={{ color: '#94a3b8' }}>{labelKey}</strong>
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={cleanData} margin={{ top: 4, right: 4, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey={labelKey} angle={-35} textAnchor="end" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
          <Bar dataKey={numKey} fill="url(#barGrad)" radius={[4, 4, 0, 0]}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}