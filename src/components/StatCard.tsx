import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'red' | 'green' | 'orange' | 'purple';
}

function StatCard({ title, value, icon: Icon, subtitle, trend, color = 'red' }: StatCardProps) {
  const colorClasses = {
    red: 'bg-fidelidade-red',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  };

  const bgColorClasses = {
    red: 'bg-red-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-2">vs. mês anterior</span>
            </div>
          )}
        </div>
        <div className={`${bgColorClasses[color]} p-3 rounded-lg`}>
          <Icon className={`h-8 w-8 ${colorClasses[color]} text-white`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export default StatCard;
