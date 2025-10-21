import { v4 as uuidv4 } from 'uuid';
import { getTrackimoClient } from '@/api/trackimoClient';
import type {
  User,
  SyncUsersResult,
  SyncEventsResult,
  PetPlan,
} from '@/types';
import {
  getAllUsers,
  saveUser,
  saveEvents,
  getAllWalks,
  saveWalk,
  saveChallenge,
  updateUserStats,
} from './storage';
import { processEventsIntoWalks, mapWalksToUsers } from './walkProcessor';
import { calculateAllChallengesForMonth } from './challengeCalculator';

/**
 * Sync Service
 * Orchestrates synchronization operations with Trackimo API
 */

/**
 * Sync users and devices from Trackimo API
 */
export async function syncUsers(): Promise<SyncUsersResult> {
  const result: SyncUsersResult = {
    success: false,
    totalProcessed: 0,
    newUsers: 0,
    updatedUsers: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    console.log('🚀 Starting user synchronization...');
    const client = getTrackimoClient();

    // Get current account details
    const accountDetails = await client.getUserDetails();
    console.log(`✅ Authenticated as: ${accountDetails.email}`);

    // Get all descendant accounts (sub-accounts = users)
    const descendants = await client.getAccountDescendants();
    console.log(`📊 Found ${descendants.length} descendant accounts`);

    result.totalProcessed = descendants.length;

    // Get existing users from storage
    const existingUsers = getAllUsers();
    const existingUsersMap = new Map(existingUsers.map((u) => [u.email, u]));

    // Process each descendant account
    for (const descendant of descendants) {
      try {
        // Use account_id (the actual field from API) or fallback to id
        const accountId = (descendant.account_id || descendant.id)?.toString();
        
        if (!accountId) {
          console.warn(`⚠️ Descendant ${descendant.email} has no account_id, skipping...`);
          result.errors++;
          continue;
        }

        // Get devices for this account
        const devices = await client.getDevices(accountId);
        console.log(`📱 Account ${descendant.email}: ${devices.length} devices`);

        // Extract NIF from email or use account ID as fallback
        // Assuming email format might contain NIF or use a custom field
        const nif = descendant.nif || accountId;

        // Get pet plan from account metadata or default to 'Pet 1'
        const petPlan: PetPlan = (descendant.pet_plan as PetPlan) || 'Pet 1';

        // Create or update user
        const existingUser = existingUsersMap.get(descendant.email);

        if (existingUser) {
          // Update existing user
          existingUser.fullName = descendant.full_name || descendant.name || descendant.email;
          existingUser.deviceId = devices[0]?.id?.toString() || existingUser.deviceId;
          existingUser.deviceName = devices[0]?.name || existingUser.deviceName;
          existingUser.petPlan = petPlan;
          existingUser.active = true;

          saveUser(existingUser);
          result.updatedUsers++;
          console.log(`✏️ Updated user: ${existingUser.email}`);
        } else {
          // Create new user
          const newUser: User = {
            id: uuidv4(),
            nif,
            email: descendant.email,
            fullName: descendant.full_name || descendant.name || descendant.email,
            petName: devices[0]?.name || 'Pet',
            petPlan,
            deviceId: devices[0]?.id?.toString() || '',
            deviceName: devices[0]?.name || '',
            accountId: accountId,
            createdAt: new Date().toISOString(),
            totalWalks: 0,
            totalChallengesCompleted: 0,
            active: true,
          };

          saveUser(newUser);
          result.newUsers++;
          console.log(`✨ Created new user: ${newUser.email}`);
        }
      } catch (error) {
        console.error(`❌ Error processing account ${descendant.email}:`, error);
        result.errors++;
        result.errorDetails?.push({
          email: descendant.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.errors < descendants.length;
    console.log('✅ User synchronization completed');
    console.log(`   New: ${result.newUsers}, Updated: ${result.updatedUsers}, Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error('❌ User synchronization failed:', error);
    result.success = false;
    result.errorDetails = [{
      email: 'N/A',
      error: error instanceof Error ? error.message : 'Unknown error',
    }];
    return result;
  }
}

/**
 * Sync events from Trackimo API for a date range
 */
export async function syncEvents(
  fromDate: Date,
  toDate: Date
): Promise<SyncEventsResult> {
  const result: SyncEventsResult = {
    success: false,
    totalEvents: 0,
    savedEvents: 0,
    processedWalks: 0,
    savedWalks: 0,
    processedChallenges: 0,
    period: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
    errors: [],
  };

  try {
    console.log('🚀 Starting events synchronization...');
    console.log(`   Period: ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    const client = getTrackimoClient();

    // Get current account details
    const accountDetails = await client.getUserDetails();
    console.log(`✅ Authenticated as: ${accountDetails.email}`);

    // Ensure account_id exists
    const accountId = (accountDetails.account_id || accountDetails.id)?.toString();
    if (!accountId) {
      throw new Error('Account ID not found in user details');
    }

    // Get all users from storage
    const users = getAllUsers();
    if (users.length === 0) {
      throw new Error('No users found. Please sync users first.');
    }

    // Convert dates to Unix timestamps (milliseconds)
    const fromTimestamp = fromDate.getTime();
    const toTimestamp = toDate.getTime();

    // Fetch events for the main account
    // Note: Events might be aggregated at the main account level
    const events = await client.getEvents(
      accountId,
      fromTimestamp,
      toTimestamp
    );

    console.log(`📍 Fetched ${events.length} events`);
    result.totalEvents = events.length;

    // Save raw events
    saveEvents(events);
    result.savedEvents = events.length;
    console.log(`💾 Saved ${events.length} raw events`);

    // Process events into walks
    const walks = processEventsIntoWalks(events);
    console.log(`🚶 Processed ${walks.length} walks`);
    result.processedWalks = walks.length;

    // Create device ID to user mapping
    const deviceToUserMap = new Map<string, { userId: string; nif: string }>();
    users.forEach((user) => {
      if (user.deviceId) {
        deviceToUserMap.set(user.deviceId, {
          userId: user.id,
          nif: user.nif,
        });
      }
    });

    // Map walks to users
    const mappedWalks = mapWalksToUsers(walks, deviceToUserMap);

    // Save walks
    mappedWalks.forEach((walk) => {
      if (walk.userId) {
        saveWalk(walk);
        result.savedWalks++;
      } else {
        console.warn(`⚠️ Walk ${walk.id} has no user mapping`);
      }
    });

    console.log(`💾 Saved ${result.savedWalks} walks`);

    // Calculate challenges for the period
    const month = fromDate.getMonth() + 1;
    const year = fromDate.getFullYear();

    console.log(`🎯 Calculating challenges for ${month}/${year}...`);

    // Get all walks (including previously saved ones)
    const allWalks = getAllWalks();

    // Calculate challenges for each user
    for (const user of users) {
      try {
        const challenges = calculateAllChallengesForMonth(allWalks, [user], month, year);

        challenges.forEach((challenge) => {
          saveChallenge(challenge);
          result.processedChallenges++;
        });

        // Update user stats
        const userWalks = allWalks.filter((w) => w.userId === user.id && w.isValid);
        const completedChallenges = challenges.filter((c) => c.status === 'completed');

        updateUserStats(user.id, userWalks.length, completedChallenges.length);
      } catch (error) {
        console.error(`❌ Error calculating challenges for user ${user.email}:`, error);
        result.errors?.push({
          eventId: 0,
          error: `Challenge calculation failed for ${user.email}`,
        });
      }
    }

    console.log(`🎯 Processed ${result.processedChallenges} challenges`);

    result.success = true;
    console.log('✅ Events synchronization completed');

    return result;
  } catch (error) {
    console.error('❌ Events synchronization failed:', error);
    result.success = false;
    result.errors = [{
      eventId: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }];
    return result;
  }
}

/**
 * Get suggested sync date ranges
 */
export function getSuggestedDateRanges(): Array<{
  label: string;
  from: Date;
  to: Date;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      label: 'Últimas 24 horas',
      from: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      to: now,
    },
    {
      label: 'Última semana',
      from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
    },
    {
      label: 'Último mês',
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    },
    {
      label: 'Mês atual',
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: now,
    },
    {
      label: 'Últimos 3 meses',
      from: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      to: now,
    },
  ];
}
