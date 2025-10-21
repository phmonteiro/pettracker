import type { User, Walk, Challenge, TrackimoEvent } from '@/types';
import { cosmosClient } from '@/api/cosmosClient';

/**
 * Storage Adapter
 * Automatically uses Cosmos DB if configured, falls back to localStorage
 */

const STORAGE_KEYS = {
  USERS: 'pet_tracker_users',
  WALKS: 'pet_tracker_walks',
  CHALLENGES: 'pet_tracker_challenges',
  EVENTS: 'pet_tracker_events',
} as const;

// Check if Cosmos DB is configured
const useCosmosDB = (): boolean => {
  return cosmosClient.isConfigured();
};

// ===== LocalStorage Helpers =====

function getFromLocalStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return [];
  }
}

function saveToLocalStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

// ===== USERS =====

export async function getAllUsers(): Promise<User[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getAllUsers();
  }
  return getFromLocalStorage<User>(STORAGE_KEYS.USERS);
}

export async function getUserByNif(nif: string): Promise<User | undefined> {
  if (useCosmosDB()) {
    return await cosmosClient.getUserByNif(nif);
  }
  const users = getFromLocalStorage<User>(STORAGE_KEYS.USERS);
  return users.find((u) => u.nif === nif);
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (useCosmosDB()) {
    return await cosmosClient.getUserById(id);
  }
  const users = getFromLocalStorage<User>(STORAGE_KEYS.USERS);
  return users.find((u) => u.id === id);
}

export async function saveUser(user: User): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.saveUser(user);
    return;
  }
  
  const users = getFromLocalStorage<User>(STORAGE_KEYS.USERS);
  const existingIndex = users.findIndex((u) => u.nif === user.nif);

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  saveToLocalStorage(STORAGE_KEYS.USERS, users);
}

export async function deleteUser(nif: string): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.deleteUser(nif);
    return;
  }
  
  const users = getFromLocalStorage<User>(STORAGE_KEYS.USERS);
  const filtered = users.filter((u) => u.nif !== nif);
  saveToLocalStorage(STORAGE_KEYS.USERS, filtered);
}

export async function deleteAllUsers(): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.deleteAllUsers();
    return;
  }
  saveToLocalStorage(STORAGE_KEYS.USERS, []);
}

// ===== WALKS =====

export async function getAllWalks(): Promise<Walk[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getAllWalks();
  }
  return getFromLocalStorage<Walk>(STORAGE_KEYS.WALKS);
}

export async function getWalkById(id: string): Promise<Walk | undefined> {
  if (useCosmosDB()) {
    return await cosmosClient.getWalkById(id);
  }
  const walks = getFromLocalStorage<Walk>(STORAGE_KEYS.WALKS);
  return walks.find((w) => w.id === id);
}

export async function getWalksByUserId(userId: string): Promise<Walk[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getWalksByUserId(userId);
  }
  const walks = getFromLocalStorage<Walk>(STORAGE_KEYS.WALKS);
  return walks.filter((w) => w.userId === userId).sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

export async function getWalksByDateRange(startDate: Date, endDate: Date): Promise<Walk[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getWalksByDateRange(startDate, endDate);
  }
  const walks = getFromLocalStorage<Walk>(STORAGE_KEYS.WALKS);
  return walks.filter((w) => {
    const walkDate = new Date(w.startTime);
    return walkDate >= startDate && walkDate <= endDate;
  }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export async function saveWalk(walk: Walk): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.saveWalk(walk);
    return;
  }
  
  const walks = getFromLocalStorage<Walk>(STORAGE_KEYS.WALKS);
  const existingIndex = walks.findIndex((w) => w.id === walk.id);

  if (existingIndex >= 0) {
    walks[existingIndex] = walk;
  } else {
    walks.push(walk);
  }

  saveToLocalStorage(STORAGE_KEYS.WALKS, walks);
}

export async function deleteWalk(id: string): Promise<void> {
  if (useCosmosDB()) {
    const walk = await cosmosClient.getWalkById(id);
    if (walk) {
      await cosmosClient.deleteWalk(id, walk.userId);
    }
    return;
  }
  
  const walks = getFromLocalStorage<Walk>(STORAGE_KEYS.WALKS);
  const filtered = walks.filter((w) => w.id !== id);
  saveToLocalStorage(STORAGE_KEYS.WALKS, filtered);
}

export async function deleteAllWalks(): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.deleteAllWalks();
    return;
  }
  saveToLocalStorage(STORAGE_KEYS.WALKS, []);
}

// ===== CHALLENGES =====

export async function getAllChallenges(): Promise<Challenge[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getAllChallenges();
  }
  return getFromLocalStorage<Challenge>(STORAGE_KEYS.CHALLENGES);
}

export async function getChallengesByUserId(userId: string): Promise<Challenge[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getChallengesByUserId(userId);
  }
  const challenges = getFromLocalStorage<Challenge>(STORAGE_KEYS.CHALLENGES);
  return challenges.filter((c) => c.userId === userId).sort(
    (a, b) => b.period.localeCompare(a.period)
  );
}

export async function getChallengesByPeriod(startDate: Date, endDate: Date): Promise<Challenge[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getChallengesByPeriod(startDate, endDate);
  }
  const challenges = getFromLocalStorage<Challenge>(STORAGE_KEYS.CHALLENGES);
  const startStr = startDate.toISOString().substring(0, 10);
  const endStr = endDate.toISOString().substring(0, 10);
  return challenges.filter((c) => c.period >= startStr && c.period <= endStr).sort(
    (a, b) => b.period.localeCompare(a.period)
  );
}

export async function saveChallenge(challenge: Challenge): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.saveChallenge(challenge);
    return;
  }
  
  const challenges = getFromLocalStorage<Challenge>(STORAGE_KEYS.CHALLENGES);
  const existingIndex = challenges.findIndex((c) => c.id === challenge.id);

  if (existingIndex >= 0) {
    challenges[existingIndex] = challenge;
  } else {
    challenges.push(challenge);
  }

  saveToLocalStorage(STORAGE_KEYS.CHALLENGES, challenges);
}

export async function deleteChallenge(id: string): Promise<void> {
  if (useCosmosDB()) {
    const challenge = await cosmosClient.getAllChallenges();
    const found = challenge.find(c => c.id === id);
    if (found) {
      await cosmosClient.deleteChallenge(id, found.userId);
    }
    return;
  }
  
  const challenges = getFromLocalStorage<Challenge>(STORAGE_KEYS.CHALLENGES);
  const filtered = challenges.filter((c) => c.id !== id);
  saveToLocalStorage(STORAGE_KEYS.CHALLENGES, filtered);
}

export async function deleteAllChallenges(): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.deleteAllChallenges();
    return;
  }
  saveToLocalStorage(STORAGE_KEYS.CHALLENGES, []);
}

// ===== EVENTS =====

export async function getAllEvents(): Promise<TrackimoEvent[]> {
  if (useCosmosDB()) {
    return await cosmosClient.getAllEvents();
  }
  return getFromLocalStorage<TrackimoEvent>(STORAGE_KEYS.EVENTS);
}

export async function saveEvent(event: TrackimoEvent): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.saveEvent(event);
    return;
  }
  
  const events = getFromLocalStorage<TrackimoEvent>(STORAGE_KEYS.EVENTS);
  const existingIndex = events.findIndex((e) => e.id === event.id);

  if (existingIndex >= 0) {
    events[existingIndex] = event;
  } else {
    events.push(event);
  }

  saveToLocalStorage(STORAGE_KEYS.EVENTS, events);
}

export async function saveEvents(events: TrackimoEvent[]): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.saveEvents(events);
    return;
  }
  
  for (const event of events) {
    await saveEvent(event);
  }
}

export async function deleteAllEvents(): Promise<void> {
  if (useCosmosDB()) {
    await cosmosClient.deleteAllEvents();
    return;
  }
  saveToLocalStorage(STORAGE_KEYS.EVENTS, []);
}

// ===== UTILITY =====

export function getStorageType(): 'cosmosdb' | 'localstorage' {
  return useCosmosDB() ? 'cosmosdb' : 'localstorage';
}

export function isCosmosDBConfigured(): boolean {
  return cosmosClient.isConfigured();
}
