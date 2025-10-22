// Pet Insurance Plan Types
export type PetPlan = 'Pet 1' | 'Pet 2' | 'Pet 3' | 'Pet Vital';

// Challenge Types
export type ChallengeType = 
  | 'weekly_three_walks'      // Passear três vezes por cada dia da semana
  | 'consistency_60'           // Manter a consistência (60 passeios)
  | 'monthly_90'               // Passear o mês todo (90 passeios)
  | 'long_walks';              // Passeios longos e frequentes

export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

// Event Types from Trackimo API
export type EventType = 'GEOZONE_ENTRY' | 'GEOZONE_EXIT';

// Device Interface
export interface Device {
  id: string;
  name: string;
}

// User/Account Interface
export interface User {
  id: string;
  nif: string;                    // Tax ID
  email: string;
  fullName: string;
  petName: string;
  petPlan: PetPlan;
  deviceId: string;               // Primary device ID (for backward compatibility)
  deviceName: string;             // Primary device name (for backward compatibility)
  devices: Device[];              // Array of all devices (NEW - preferred way)
  accountId: string;
  createdAt: string;              // ISO date string
  totalWalks: number;
  totalChallengesCompleted: number;
  active: boolean;
}

// Trackimo API Event
export interface TrackimoEvent {
  id: number;
  message: string;
  lat: number;
  lng: number;
  priority: string;
  address: string;
  speed: number;
  batteryLevel: number;
  extras: string;
  archived: boolean;
  alarmTypeAsInt: number;
  device_id: number;
  device_name: string;
  read: boolean;
  created: number;                // Unix timestamp in milliseconds
  location_type: string;
  alarm_type: EventType;
  geozone_name: string;
  account_email: string;
  account_full_name: string;
  age: number;
  timestamp: string;              // ISO date string
}

// Walk (Passeio)
export interface Walk {
  id: string;
  userId: string;
  nif: string;
  petName: string;
  deviceId: string;
  geozoneName: string;
  exitEvent: TrackimoEvent;
  entryEvent: TrackimoEvent;
  startTime: string;              // ISO date string
  endTime: string;                // ISO date string
  durationMinutes: number;
  durationSeconds: number;
  isValid: boolean;               // >= 10 minutes
  distance?: number;              // Optional: calculated distance in meters
  exitLat: number;
  exitLng: number;
  entryLat: number;
  entryLng: number;
  createdAt: string;
}

// Challenge
export interface Challenge {
  id: string;
  userId: string;
  nif: string;
  type: ChallengeType;
  month: number;                  // 1-12
  year: number;
  status: ChallengeStatus;
  progress: number;               // Current progress value
  target: number;                 // Target value to complete
  reward: number;                 // FidCoins reward
  completedAt?: string;           // ISO date string
  metadata?: {
    // For weekly_three_walks
    weekNumber?: number;
    weekStartDate?: string;
    weekEndDate?: string;
    dailyWalks?: Record<string, number>; // Date -> count
    
    // For consistency_60
    consecutiveDays?: number;
    lastWalkDate?: string;
    
    // For long_walks
    consecutiveLongWalks?: number;
    lastLongWalkDate?: string;
  };
}

// Monthly Reward Report
export interface MonthlyReward {
  id: string;
  userId: string;
  nif: string;
  fullName: string;
  petName: string;
  month: number;
  year: number;
  challenges: {
    type: ChallengeType;
    completed: boolean;
    reward: number;
  }[];
  totalReward: number;
  totalWalksInMonth: number;
  exportedAt?: string;
}

// Dashboard Statistics
export interface DashboardStats {
  totalUsers: number;
  totalPets: number;
  totalWalksLastMonth: number;
  totalChallengesCompletedLastMonth: number;
  averageWalksPerPet: number;
  averageChallengesPerPet: number;
  topUsers: TopUser[];
}

export interface TopUser {
  rank: number;
  nif: string;
  fullName: string;
  petName: string;
  totalWalks: number;
  totalChallenges: number;
  combinedScore: number;
}

// API Configuration
export interface TrackimoConfig {
  bearerToken?: string;           // Pre-existing Bearer token (if available)
  username: string;
  password: string;
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Token Cache
export interface TokenCache {
  accessToken: string | null;
  tokenExpiry: Date | null;
  accountId: string | null;
}

// API Response Types
export interface TrackimoAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TrackimoAccountResponse {
  id?: string;              // Added by our code from account_id
  email: string;
  firstName: string;
  lastName: string;
  user_name: string;
  user_id: number;
  account_id: number;       // The actual account ID from API
  phone: string;
  logo_url: string;
  geo_fence_min_range: number;
  roles: string[];
  preferences: {
    language: string;
    timezone_id: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface TrackimoDescendantAccount {
  account_id: number;       // The actual field from API
  id?: string;              // Optional for backward compatibility
  name: string;
  email: string;
  full_name?: string;
  parent_id?: string;
  nif?: string;
  descendants?: TrackimoDescendantAccount[];
  device_ids?: number[];
  [key: string]: any;
}

export interface TrackimoDevice {
  id: number;
  name: string;
  type: string;
  status: string;
  [key: string]: any;
}

// Sync Operation Results
export interface SyncUsersResult {
  success: boolean;
  totalProcessed: number;
  newUsers: number;
  updatedUsers: number;
  errors: number;
  errorDetails?: Array<{ email: string; error: string }>;
}

export interface SyncEventsResult {
  success: boolean;
  totalEvents: number;
  savedEvents: number;
  processedWalks: number;
  savedWalks: number;
  processedChallenges: number;
  period: {
    from: string;
    to: string;
  };
  errors?: Array<{ eventId: number; error: string }>;
}

// Filter and Sort Options
export interface TableFilter {
  searchText: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Challenge Rewards Configuration
export const CHALLENGE_REWARDS: Record<ChallengeType, Record<PetPlan, number>> = {
  weekly_three_walks: {
    'Pet 1': 50,
    'Pet 2': 50,
    'Pet 3': 70,
    'Pet Vital': 70,
  },
  consistency_60: {
    'Pet 1': 40,
    'Pet 2': 40,
    'Pet 3': 60,
    'Pet Vital': 60,
  },
  monthly_90: {
    'Pet 1': 50,
    'Pet 2': 50,
    'Pet 3': 70,
    'Pet Vital': 70,
  },
  long_walks: {
    'Pet 1': 50,
    'Pet 2': 50,
    'Pet 3': 70,
    'Pet Vital': 70,
  },
};

// Challenge Names
export const CHALLENGE_NAMES: Record<ChallengeType, string> = {
  weekly_three_walks: 'Passear três vezes por cada dia da semana',
  consistency_60: 'Manter a consistência',
  monthly_90: 'Passear o mês todo',
  long_walks: 'Passeios longos e frequentes',
};

// Challenge Descriptions
export const CHALLENGE_DESCRIPTIONS: Record<ChallengeType, string> = {
  weekly_three_walks: 'Efetuar pelo menos três passeios por dia de segunda a domingo',
  consistency_60: 'Efetuar 60 passeios sem que se passe um dia sem passeios',
  monthly_90: 'Efetuar um total de 90 passeios desde o primeiro ao último dia do mês',
  long_walks: 'Efetuar uma série de três passeios consecutivos com duração ≥ 15 minutos',
};

// Constants
export const MIN_WALK_DURATION_SECONDS = 600;  // 10 minutes
export const LONG_WALK_DURATION_SECONDS = 900;  // 15 minutes
export const REQUIRED_CONSECUTIVE_LONG_WALKS = 3;
export const REQUIRED_DAILY_WALKS = 3;
export const REQUIRED_CONSISTENCY_WALKS = 60;
export const REQUIRED_MONTHLY_WALKS = 90;
