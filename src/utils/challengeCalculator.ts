import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isWithinInterval,
  differenceInDays,
  addDays,
  getYear,
  getMonth,
  isSunday,
  isMonday,
  parseISO,
} from 'date-fns';
import type {
  Walk,
  Challenge,
  User,
} from '@/types';
import {
  CHALLENGE_REWARDS,
  LONG_WALK_DURATION_SECONDS,
  REQUIRED_CONSECUTIVE_LONG_WALKS,
  REQUIRED_DAILY_WALKS,
  REQUIRED_CONSISTENCY_WALKS,
  REQUIRED_MONTHLY_WALKS,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Challenge Calculation Engine
 * Implements the business logic for all 4 challenge types
 */

/**
 * Get week bounds that respect the month calculation rules:
 * - Week belongs to the month where Sunday falls
 * - If week spans months, it belongs to the month of the Sunday
 */
function getWeekBoundsForMonth(date: Date): { start: Date; end: Date; month: number; year: number } {
  // Get the week start (Monday) and end (Sunday)
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday

  // The week belongs to the month where Sunday falls
  const month = getMonth(weekEnd) + 1; // 1-12
  const year = getYear(weekEnd);

  return {
    start: weekStart,
    end: weekEnd,
    month,
    year,
  };
}

/**
 * Get all complete weeks in a month
 * A week is complete if it has all 7 days (Monday to Sunday)
 */
function getCompleteWeeksInMonth(month: number, year: number): Array<{ start: Date; end: Date }> {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  const weeks: Array<{ start: Date; end: Date }> = [];
  let currentDate = monthStart;

  // If month doesn't start on Monday, move to the first Monday
  while (!isMonday(currentDate) && currentDate <= monthEnd) {
    currentDate = addDays(currentDate, 1);
  }

  // Collect all complete weeks
  while (currentDate <= monthEnd) {
    const weekStart = currentDate;
    const weekEnd = addDays(currentDate, 6); // Sunday

    // Only include if the entire week is valid and Sunday is in this month
    if (weekEnd <= monthEnd || (isSunday(weekEnd) && getMonth(weekEnd) + 1 === month)) {
      const bounds = getWeekBoundsForMonth(weekStart);
      if (bounds.month === month && bounds.year === year) {
        weeks.push({ start: weekStart, end: weekEnd });
      }
    }

    currentDate = addDays(currentDate, 7);
  }

  return weeks;
}

/**
 * Challenge 1: Passear três vezes por cada dia da semana
 * Must have at least 3 walks per day from Monday to Sunday
 * Week belongs to month where Sunday falls
 */
export function calculateWeeklyThreeWalksChallenge(
  walks: Walk[],
  user: User,
  month: number,
  year: number
): Challenge[] {
  const challenges: Challenge[] = [];
  const weeks = getCompleteWeeksInMonth(month, year);

  weeks.forEach((week, index) => {
    const weekWalks = walks.filter((walk) => {
      const walkDate = parseISO(walk.startTime);
      return (
        walk.userId === user.id &&
        walk.isValid &&
        isWithinInterval(walkDate, { start: week.start, end: week.end })
      );
    });

    // Group walks by day
    const walksByDay: Record<string, Walk[]> = {};
    weekWalks.forEach((walk) => {
      const dayKey = format(parseISO(walk.startTime), 'yyyy-MM-dd');
      if (!walksByDay[dayKey]) {
        walksByDay[dayKey] = [];
      }
      walksByDay[dayKey].push(walk);
    });

    // Check if all 7 days have at least 3 walks
    let daysCompleted = 0;
    const dailyWalks: Record<string, number> = {};

    for (let i = 0; i < 7; i++) {
      const day = addDays(week.start, i);
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayWalkCount = walksByDay[dayKey]?.length || 0;
      dailyWalks[dayKey] = dayWalkCount;

      if (dayWalkCount >= REQUIRED_DAILY_WALKS) {
        daysCompleted++;
      }
    }

    const completed = daysCompleted === 7;
    const reward = CHALLENGE_REWARDS.weekly_three_walks[user.petPlan];

    const challenge: Challenge = {
      id: uuidv4(),
      userId: user.id,
      nif: user.nif,
      type: 'weekly_three_walks',
      month,
      year,
      status: completed ? 'completed' : daysCompleted > 0 ? 'in_progress' : 'not_started',
      progress: daysCompleted,
      target: 7,
      reward: completed ? reward : 0,
      completedAt: completed ? new Date().toISOString() : undefined,
      metadata: {
        weekNumber: index + 1,
        weekStartDate: format(week.start, 'yyyy-MM-dd'),
        weekEndDate: format(week.end, 'yyyy-MM-dd'),
        dailyWalks,
      },
    };

    challenges.push(challenge);
  });

  return challenges;
}

/**
 * Challenge 2: Manter a consistência
 * Must have 60 consecutive walks without a day gap
 * No limit on daily walks
 */
export function calculateConsistencyChallenge(
  walks: Walk[],
  user: User,
  month: number,
  year: number
): Challenge {
  const validWalks = walks.filter((w) => w.userId === user.id && w.isValid);
  
  // Sort walks by date
  const sortedWalks = validWalks.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  let maxConsecutiveDays = 0;
  let currentStreak = 0;
  let lastWalkDate: Date | null = null;
  let consecutiveWalkCount = 0;
  let currentStreakWalkCount = 0;

  sortedWalks.forEach((walk) => {
    const walkDate = parseISO(walk.startTime);
    const walkDateOnly = new Date(walkDate.getFullYear(), walkDate.getMonth(), walkDate.getDate());

    if (lastWalkDate) {
      const daysDiff = differenceInDays(walkDateOnly, lastWalkDate);

      if (daysDiff === 0) {
        // Same day, just increment walk count
        currentStreakWalkCount++;
      } else if (daysDiff === 1) {
        // Consecutive day
        currentStreak++;
        currentStreakWalkCount++;
      } else {
        // Gap detected, reset streak
        maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak);
        consecutiveWalkCount = Math.max(consecutiveWalkCount, currentStreakWalkCount);
        currentStreak = 1;
        currentStreakWalkCount = 1;
      }

      lastWalkDate = walkDateOnly;
    } else {
      // First walk
      lastWalkDate = walkDateOnly;
      currentStreak = 1;
      currentStreakWalkCount = 1;
    }
  });

  // Final check
  maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak);
  consecutiveWalkCount = Math.max(consecutiveWalkCount, currentStreakWalkCount);

  const completed = consecutiveWalkCount >= REQUIRED_CONSISTENCY_WALKS;
  const reward = CHALLENGE_REWARDS.consistency_60[user.petPlan];

  return {
    id: uuidv4(),
    userId: user.id,
    nif: user.nif,
    type: 'consistency_60',
    month,
    year,
    status: completed ? 'completed' : consecutiveWalkCount > 0 ? 'in_progress' : 'not_started',
    progress: consecutiveWalkCount,
    target: REQUIRED_CONSISTENCY_WALKS,
    reward: completed ? reward : 0,
    completedAt: completed ? new Date().toISOString() : undefined,
    metadata: {
      consecutiveDays: maxConsecutiveDays,
      lastWalkDate: lastWalkDate ? format(lastWalkDate, 'yyyy-MM-dd') : undefined,
    },
  };
}

/**
 * Challenge 3: Passear o mês todo
 * Must have 90 total walks in the month
 * Gaps between days are allowed
 */
export function calculateMonthlyTotalChallenge(
  walks: Walk[],
  user: User,
  month: number,
  year: number
): Challenge {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  const monthWalks = walks.filter((walk) => {
    const walkDate = parseISO(walk.startTime);
    return (
      walk.userId === user.id &&
      walk.isValid &&
      isWithinInterval(walkDate, { start: monthStart, end: monthEnd })
    );
  });

  const totalWalks = monthWalks.length;
  const completed = totalWalks >= REQUIRED_MONTHLY_WALKS;
  const reward = CHALLENGE_REWARDS.monthly_90[user.petPlan];

  return {
    id: uuidv4(),
    userId: user.id,
    nif: user.nif,
    type: 'monthly_90',
    month,
    year,
    status: completed ? 'completed' : totalWalks > 0 ? 'in_progress' : 'not_started',
    progress: totalWalks,
    target: REQUIRED_MONTHLY_WALKS,
    reward: completed ? reward : 0,
    completedAt: completed ? new Date().toISOString() : undefined,
  };
}

/**
 * Challenge 4: Passeios longos e frequentes
 * Must have 3 consecutive walks with duration >= 15 minutes
 */
export function calculateLongWalksChallenge(
  walks: Walk[],
  user: User,
  month: number,
  year: number
): Challenge {
  const validWalks = walks.filter(
    (w) => w.userId === user.id && w.isValid && w.durationSeconds >= LONG_WALK_DURATION_SECONDS
  );

  // Sort walks by date
  const sortedWalks = validWalks.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  let maxConsecutiveLongWalks = 0;
  let currentStreak = 0;
  let lastWalkDate: Date | null = null;

  sortedWalks.forEach((walk) => {
    const walkDate = parseISO(walk.startTime);
    const walkDateOnly = new Date(walkDate.getFullYear(), walkDate.getMonth(), walkDate.getDate());

    if (lastWalkDate) {
      const daysDiff = differenceInDays(walkDateOnly, lastWalkDate);

      if (daysDiff === 0) {
        // Same day, increment streak
        currentStreak++;
      } else if (daysDiff === 1) {
        // Consecutive day
        currentStreak++;
      } else {
        // Gap detected, reset streak
        maxConsecutiveLongWalks = Math.max(maxConsecutiveLongWalks, currentStreak);
        currentStreak = 1;
      }

      lastWalkDate = walkDateOnly;
    } else {
      // First walk
      lastWalkDate = walkDateOnly;
      currentStreak = 1;
    }
  });

  // Final check
  maxConsecutiveLongWalks = Math.max(maxConsecutiveLongWalks, currentStreak);

  const completed = maxConsecutiveLongWalks >= REQUIRED_CONSECUTIVE_LONG_WALKS;
  const reward = CHALLENGE_REWARDS.long_walks[user.petPlan];

  return {
    id: uuidv4(),
    userId: user.id,
    nif: user.nif,
    type: 'long_walks',
    month,
    year,
    status: completed ? 'completed' : maxConsecutiveLongWalks > 0 ? 'in_progress' : 'not_started',
    progress: maxConsecutiveLongWalks,
    target: REQUIRED_CONSECUTIVE_LONG_WALKS,
    reward: completed ? reward : 0,
    completedAt: completed ? new Date().toISOString() : undefined,
    metadata: {
      consecutiveLongWalks: maxConsecutiveLongWalks,
      lastLongWalkDate: lastWalkDate ? format(lastWalkDate, 'yyyy-MM-dd') : undefined,
    },
  };
}

/**
 * Calculate all challenges for a user in a specific month
 */
export function calculateAllChallengesForUser(
  walks: Walk[],
  user: User,
  month: number,
  year: number
): Challenge[] {
  const challenges: Challenge[] = [];

  // Challenge 1: Weekly three walks (can have multiple per month)
  const weeklyChallenges = calculateWeeklyThreeWalksChallenge(walks, user, month, year);
  challenges.push(...weeklyChallenges);

  // Challenge 2: Consistency
  const consistencyChallenge = calculateConsistencyChallenge(walks, user, month, year);
  challenges.push(consistencyChallenge);

  // Challenge 3: Monthly total
  const monthlyChallenge = calculateMonthlyTotalChallenge(walks, user, month, year);
  challenges.push(monthlyChallenge);

  // Challenge 4: Long walks
  const longWalksChallenge = calculateLongWalksChallenge(walks, user, month, year);
  challenges.push(longWalksChallenge);

  return challenges;
}

/**
 * Calculate challenges for all users in a specific month
 */
export function calculateAllChallengesForMonth(
  walks: Walk[],
  users: User[],
  month: number,
  year: number
): Challenge[] {
  const allChallenges: Challenge[] = [];

  users.forEach((user) => {
    const userChallenges = calculateAllChallengesForUser(walks, user, month, year);
    allChallenges.push(...userChallenges);
  });

  return allChallenges;
}
