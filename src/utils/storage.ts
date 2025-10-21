/**
 * Storage Wrapper
 * Provides synchronous-like interface while using async storage adapter
 * For now, uses localStorage directly to maintain compatibility
 * TODO: Migrate to async/await pattern in consuming code
 */

import type { User, Walk, Challenge, TrackimoEvent } from '@/types';

const STORAGE_KEYS = {
  USERS: 'pet_tracker_users',
  WALKS: 'pet_tracker_walks',
  CHALLENGES: 'pet_tracker_challenges',
  EVENTS: 'pet_tracker_events',
} as const;

// Generic storage functions
function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

// ===== USERS =====

export function getAllUsers(): User[] {
  return getFromStorage<User>(STORAGE_KEYS.USERS);
}

export function getUserByNif(nif: string): User | undefined {
  const users = getAllUsers();
  return users.find((u) => u.nif === nif);
}

export function getUserById(id: string): User | undefined {
  const users = getAllUsers();
  return users.find((u) => u.id === id);
}

export function saveUser(user: User): void {
  const users = getAllUsers();
  const existingIndex = users.findIndex((u) => u.nif === user.nif);

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function deleteUser(nif: string): void {
  const users = getAllUsers();
  const filtered = users.filter((u) => u.nif !== nif);
  saveToStorage(STORAGE_KEYS.USERS, filtered);
}

export function deleteAllUsers(): void {
  saveToStorage(STORAGE_KEYS.USERS, []);
}

export function updateUserStats(userId: string, totalWalks: number, totalChallengesCompleted: number): void {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  
  if (user) {
    user.totalWalks = totalWalks;
    user.totalChallengesCompleted = totalChallengesCompleted;
    saveUser(user);
  }
}

// ===== WALKS =====

export function getAllWalks(): Walk[] {
  return getFromStorage<Walk>(STORAGE_KEYS.WALKS);
}

export function getWalkById(id: string): Walk | undefined {
  const walks = getAllWalks();
  return walks.find((w) => w.id === id);
}

export function getWalksByUserId(userId: string): Walk[] {
  const walks = getAllWalks();
  return walks
    .filter((w) => w.userId === userId)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export function getWalksByDateRange(startDate: Date, endDate: Date): Walk[] {
  const walks = getAllWalks();
  return walks
    .filter((w) => {
      const walkDate = new Date(w.startTime);
      return walkDate >= startDate && walkDate <= endDate;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export function saveWalk(walk: Walk): void {
  const walks = getAllWalks();
  const existingIndex = walks.findIndex((w) => w.id === walk.id);

  if (existingIndex >= 0) {
    walks[existingIndex] = walk;
  } else {
    walks.push(walk);
  }

  saveToStorage(STORAGE_KEYS.WALKS, walks);
}

export function deleteWalk(id: string): void {
  const walks = getAllWalks();
  const filtered = walks.filter((w) => w.id !== id);
  saveToStorage(STORAGE_KEYS.WALKS, filtered);
}

export function deleteAllWalks(): void {
  saveToStorage(STORAGE_KEYS.WALKS, []);
}

// ===== CHALLENGES =====

export function getAllChallenges(): Challenge[] {
  return getFromStorage<Challenge>(STORAGE_KEYS.CHALLENGES);
}

export function getChallengesByUserId(userId: string): Challenge[] {
  const challenges = getAllChallenges();
  return challenges
    .filter((c) => c.userId === userId)
    .sort((a, b) => {
      // Sort by year then month (descending)
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

export function getChallengesByPeriod(startDate: Date, endDate: Date): Challenge[] {
  const challenges = getAllChallenges();
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  
  return challenges
    .filter((c) => {
      const challengeDate = new Date(c.year, c.month - 1);
      const start = new Date(startYear, startMonth - 1);
      const end = new Date(endYear, endMonth - 1);
      return challengeDate >= start && challengeDate <= end;
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

export function saveChallenge(challenge: Challenge): void {
  const challenges = getAllChallenges();
  const existingIndex = challenges.findIndex((c) => c.id === challenge.id);

  if (existingIndex >= 0) {
    challenges[existingIndex] = challenge;
  } else {
    challenges.push(challenge);
  }

  saveToStorage(STORAGE_KEYS.CHALLENGES, challenges);
}

export function deleteChallenge(id: string): void {
  const challenges = getAllChallenges();
  const filtered = challenges.filter((c) => c.id !== id);
  saveToStorage(STORAGE_KEYS.CHALLENGES, filtered);
}

export function deleteAllChallenges(): void {
  saveToStorage(STORAGE_KEYS.CHALLENGES, []);
}

// ===== EVENTS =====

export function getAllEvents(): TrackimoEvent[] {
  return getFromStorage<TrackimoEvent>(STORAGE_KEYS.EVENTS);
}

export function saveEvent(event: TrackimoEvent): void {
  const events = getAllEvents();
  const existingIndex = events.findIndex((e) => e.id === event.id);

  if (existingIndex >= 0) {
    events[existingIndex] = event;
  } else {
    events.push(event);
  }

  saveToStorage(STORAGE_KEYS.EVENTS, events);
}

export function saveEvents(events: TrackimoEvent[]): void {
  for (const event of events) {
    saveEvent(event);
  }
}

export function deleteAllEvents(): void {
  saveToStorage(STORAGE_KEYS.EVENTS, []);
}
