import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function PieChartCoolers({ data, dataKey, nameKey, colors, title }: {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
  title?: string;
}) {
  return (
    <div style={{ width: '100%', height: 250 }}>
      <h3 className="font-semibold mb-2 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
