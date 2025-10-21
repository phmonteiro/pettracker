import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChallengesChartProps {
  data: Array<{
    type: string;
    completed: number;
    total: number;
    rate: number;
  }>;
}

function ChallengesChart({ data }: ChallengesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Conclusão de Desafios</h3>
        <div className="text-center py-8 text-gray-500">
          <p>Sem dados de desafios disponíveis.</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Conclusão de Desafios</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" />
          <YAxis />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'rate') return `${value}%`;
              return value;
            }}
          />
          <Legend />
          <Bar dataKey="rate" name="Taxa de Conclusão (%)" fill="#10b981">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div key={item.type} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <div className="text-sm">
              <p className="font-medium text-gray-900">{item.type}</p>
              <p className="text-gray-500">
                {item.completed} / {item.total} ({item.rate}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChallengesChart;
