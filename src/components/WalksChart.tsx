import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WalksChartProps {
  data: Array<{ month: string; walks: number }>;
}

function WalksChart({ data }: WalksChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução de Passeios</h3>
        <div className="text-center py-8 text-gray-500">
          <p>Sem dados de passeios disponíveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução de Passeios (Últimos 6 Meses)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="walks" fill="#0284c7" name="Passeios" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WalksChart;
