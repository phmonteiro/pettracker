import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { User, Walk, Challenge, DashboardStats, TopUser } from '@/types';
import { backendAPI } from '@/api/backendClient';

/**
 * Calculate comprehensive dashboard statistics
 */
export async function calculateDashboardStats(): Promise<DashboardStats> {
  const users = await backendAPI.getUsers();
  const walks = await backendAPI.getWalks();
  const challenges = await backendAPI.getChallenges();

  // Get last month's date range
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = startOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);

  // Filter walks from last month
  const lastMonthWalks = walks.filter((walk) => {
    const walkDate = new Date(walk.startTime);
    return walkDate >= lastMonthStart && walkDate <= lastMonthEnd;
  });

  // Filter completed challenges from last month
  const lastMonthChallenges = challenges.filter((challenge) => {
    const challengeDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    return (
      challenge.status === 'completed' &&
      challenge.month === challengeDate.getMonth() + 1 &&
      challenge.year === challengeDate.getFullYear()
    );
  });

  // Calculate averages
  const activeUsers = users.filter((u) => u.active);
  const totalUsers = activeUsers.length;
  const totalPets = totalUsers; // One pet per user
  const totalWalksLastMonth = lastMonthWalks.length;
  const totalChallengesCompletedLastMonth = lastMonthChallenges.length;

  const averageWalksPerPet = totalPets > 0 ? totalWalksLastMonth / totalPets : 0;
  const averageChallengesPerPet = totalPets > 0 ? totalChallengesCompletedLastMonth / totalPets : 0;

  // Calculate top users
  const topUsers = calculateTopUsers(users, walks, challenges);

  return {
    totalUsers,
    totalPets,
    totalWalksLastMonth,
    totalChallengesCompletedLastMonth,
    averageWalksPerPet: Math.round(averageWalksPerPet * 10) / 10,
    averageChallengesPerPet: Math.round(averageChallengesPerPet * 10) / 10,
    topUsers,
  };
}

/**
 * Calculate Top 10 users based on walks and challenges
 */
export function calculateTopUsers(
  users: User[],
  walks: Walk[],
  challenges: Challenge[]
): TopUser[] {
  const userStats = users.map((user) => {
    // Count valid walks for this user
    const userWalks = walks.filter((w) => w.userId === user.id && w.isValid);
    const totalWalks = userWalks.length;

    // Count completed challenges for this user
    const userChallenges = challenges.filter(
      (c) => c.userId === user.id && c.status === 'completed'
    );
    const totalChallenges = userChallenges.length;

    // Combined score: walks worth 1 point, challenges worth 10 points
    const combinedScore = totalWalks + totalChallenges * 10;

    return {
      nif: user.nif,
      fullName: user.fullName,
      petName: user.petName,
      totalWalks,
      totalChallenges,
      combinedScore,
    };
  });

  // Sort by combined score (descending) and take top 10
  const sortedUsers = userStats
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 10);

  // Add rank
  return sortedUsers.map((user, index) => ({
    rank: index + 1,
    ...user,
  }));
}

/**
 * Get walks grouped by month for chart data
 */
export async function getWalksChartData(months: number = 6): Promise<Array<{ month: string; walks: number }>> {
  const walks = await backendAPI.getWalks();
  const now = new Date();
  const chartData: Array<{ month: string; walks: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = subMonths(now, i);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    const monthWalks = walks.filter((walk: Walk) => {
      const walkDate = new Date(walk.startTime);
      return walkDate >= monthStart && walkDate <= monthEnd && walk.isValid;
    });

    chartData.push({
      month: targetDate.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }),
      walks: monthWalks.length,
    });
  }

  return chartData;
}

/**
 * Get challenges completion rate by type
 */
export async function getChallengesChartData(): Promise<Array<{
  type: string;
  completed: number;
  total: number;
  rate: number;
}>> {
  const challenges = await backendAPI.getChallenges();

  const challengeTypes = [
    { key: 'weekly_three_walks', label: 'Passeios Semanais' },
    { key: 'consistency_60', label: 'Consistência' },
    { key: 'monthly_90', label: 'Mensal 90' },
    { key: 'long_walks', label: 'Passeios Longos' },
  ];

  return challengeTypes.map(({ key, label }) => {
    const typeChallenges = challenges.filter((c: Challenge) => c.type === key);
    const completed = typeChallenges.filter((c: Challenge) => c.status === 'completed').length;
    const total = typeChallenges.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      type: label,
      completed,
      total,
      rate,
    };
  });
}

/**
 * Get pet plan distribution
 */
export async function getPetPlanDistribution(): Promise<Array<{ plan: string; count: number }>> {
  const users = await backendAPI.getUsers();

  const planCounts: Record<string, number> = {
    'Pet 1': 0,
    'Pet 2': 0,
    'Pet 3': 0,
    'Pet Vital': 0,
  };

  users.forEach((user: User) => {
    if (planCounts[user.petPlan] !== undefined) {
      planCounts[user.petPlan]++;
    }
  });

  return Object.entries(planCounts).map(([plan, count]) => ({
    plan,
    count,
  }));
}

/**
 * Get recent activity (last 10 walks)
 */
export async function getRecentActivity(limit: number = 10): Promise<Walk[]> {
  const walks = await backendAPI.getWalks();

  return walks
    .filter((w: Walk) => w.isValid)
    .sort((a: Walk, b: Walk) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit);
}
