import { useEffect, useState } from 'react';
import { Users, Footprints, Target, Trophy, RefreshCw } from 'lucide-react';
import StatCard from '@/components/StatCard';
import TopUsersTable from '@/components/TopUsersTable';
import WalksChart from '@/components/WalksChart';
import ChallengesChart from '@/components/ChallengesChart';
import type { DashboardStats } from '@/types';
import {
  calculateDashboardStats,
  getWalksChartData,
  getChallengesChartData,
} from '@/utils/dashboardStats';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [walksChartData, setWalksChartData] = useState<Array<{ month: string; walks: number }>>([]);
  const [challengesChartData, setChallengesChartData] = useState<
    Array<{ type: string; completed: number; total: number; rate: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = () => {
    try {
      setIsLoading(true);
      const dashboardStats = calculateDashboardStats();
      const walksData = getWalksChartData(6);
      const challengesData = getChallengesChartData();

      setStats(dashboardStats);
      setWalksChartData(walksData);
      setChallengesChartData(challengesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-fidelidade-red animate-spin mx-auto mb-4" />
          <p className="text-gray-600">A carregar dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Erro ao carregar dados do dashboard.</p>
        <button onClick={loadDashboardData} className="btn btn-primary mt-4">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral do programa de recompensas Pet Tracker</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Utilizadores"
          value={stats.totalUsers}
          icon={Users}
          subtitle="Utilizadores ativos"
          color="red"
        />
        <StatCard
          title="Total de Pets"
          value={stats.totalPets}
          icon={Trophy}
          subtitle="Pets registados"
          color="green"
        />
        <StatCard
          title="Passeios (Último Mês)"
          value={stats.totalWalksLastMonth}
          icon={Footprints}
          subtitle={`Média: ${stats.averageWalksPerPet} por pet`}
          color="orange"
        />
        <StatCard
          title="Desafios Completados"
          value={stats.totalChallengesCompletedLastMonth}
          icon={Target}
          subtitle={`Média: ${stats.averageChallengesPerPet} por pet`}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WalksChart data={walksChartData} />
        <ChallengesChart data={challengesChartData} />
      </div>

      {/* Top Users Table */}
      <TopUsersTable topUsers={stats.topUsers} />

      {/* Quick Info */}
      <div className="card bg-red-50 border-l-4 border-fidelidade-red">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-fidelidade-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Informação</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Os dados apresentados refletem as estatísticas dos passeios e desafios completados.
                Para atualizar os dados, vá para a página de <strong>Sincronização</strong> e
                sincronize os eventos mais recentes da API Trackimo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State Message */}
      {stats.totalUsers === 0 && (
        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ainda não há utilizadores</h3>
          <p className="text-gray-600 mb-6">
            Comece por sincronizar os utilizadores da API Trackimo para ver os dados no dashboard.
          </p>
          <a href="/sync" className="btn btn-primary inline-flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Ir para Sincronização
          </a>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
