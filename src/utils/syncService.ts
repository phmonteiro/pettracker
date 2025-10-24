import { v4 as uuidv4 } from 'uuid';
import { trackimoClient } from '@/api/trackimoProxyClient';
import { backendAPI } from '@/api/backendClient';
import type {
  User,
  Device,
  SyncUsersResult,
  SyncEventsResult,
  PetPlan,
} from '@/types';
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

    // Get current account details
    const accountDetails = await trackimoClient.getUserAccount();
    console.log(`✅ Authenticated as: ${accountDetails.email}`);
    console.log('📋 Account details:', JSON.stringify(accountDetails, null, 2));

    // Get account ID (handle different possible field names)
    const accountId = accountDetails.account_id || accountDetails.accountId || accountDetails.id;
    if (!accountId) {
      throw new Error('No account ID found in user details. Available fields: ' + Object.keys(accountDetails).join(', '));
    }

    // Get all descendant accounts (sub-accounts = users)
    const descendantsResponse = await trackimoClient.getDescendants(accountId.toString());
    const descendants = descendantsResponse.descendants;
    console.log(`📊 Found ${descendants.length} descendant accounts`);

    // Include the main account in the list to sync (it might have devices too!)
    const allAccounts = [accountDetails, ...descendants];
    console.log(`📊 Total accounts to sync (including main): ${allAccounts.length}`);

    result.totalProcessed = allAccounts.length;

    // Get existing users from Cosmos DB via backend API
    const existingUsers = await backendAPI.getUsers();
    const existingUsersMap = new Map(existingUsers.map((u) => [u.email, u]));

    // Process each account (main + descendants)
    for (const descendant of allAccounts) {
      try {
        // Use account_id (the actual field from API) or fallback to id
        const accountId = (descendant.account_id || descendant.id)?.toString();
        
        if (!accountId) {
          console.warn(`⚠️ Descendant ${descendant.email} has no account_id, skipping...`);
          result.errors++;
          continue;
        }

        // Get devices for this account
        const devices = await trackimoClient.getDevices(accountId);
        console.log(`📱 Account ${descendant.email}: ${devices.length} devices`);
        if (devices.length > 0) {
          devices.forEach((device, index) => {
            console.log(`   Device ${index}: deviceId=${device.deviceId}, deviceName=${device.deviceName}`);
          });
        } else {
          console.warn(`   ⚠️ No devices found for account ${accountId}`);
        }

        // Extract NIF from email or use account ID as fallback
        // Assuming email format might contain NIF or use a custom field
        const nif = descendant.nif || accountId;

        // Get pet plan from account metadata or default to 'Pet 1'
        const petPlan: PetPlan = (descendant.pet_plan as PetPlan) || 'Pet 1';

        // Create or update user
        const existingUser = existingUsersMap.get(descendant.email);

        // Extract all devices as structured array
        const devicesArray: Device[] = devices
          .filter(d => d.deviceId)
          .map(d => ({
            id: d.deviceId.toString(),
            name: d.deviceName || 'Unknown Device'
          }));
        
        // Keep backward compatibility fields (primary device)
        const deviceId = devicesArray[0]?.id || existingUser?.deviceId || '';
        const deviceName = devicesArray[0]?.name || existingUser?.deviceName || '';

        if (existingUser) {
          // Update existing user
          const updatedUser: User = {
            ...existingUser,
            fullName: descendant.full_name || descendant.name || descendant.email,
            deviceId,
            deviceName,
            devices: devicesArray,
            petPlan,
            accountId: accountId,
            active: true,
          };

          console.log(`✏️ Updating user: ${updatedUser.email}, deviceId: ${deviceId || '(empty)'}, total devices: ${devicesArray.length}`);
          await backendAPI.saveUser(updatedUser);
          result.updatedUsers++;
        } else {
          // Create new user
          const newUser: User = {
            id: uuidv4(),
            nif,
            email: descendant.email,
            fullName: descendant.full_name || descendant.name || descendant.email,
            petName: deviceName || 'Pet',
            petPlan,
            deviceId,
            deviceName,
            devices: devicesArray,
            accountId: accountId,
            createdAt: new Date().toISOString(),
            totalWalks: 0,
            totalChallengesCompleted: 0,
            active: true,
          };

          console.log(`✨ Creating new user: ${newUser.email}, deviceId: ${deviceId || '(empty)'}, total devices: ${devicesArray.length}`);
          await backendAPI.saveUser(newUser);
          result.newUsers++;
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

    // Get current account details
    const accountDetails = await trackimoClient.getUserAccount();
    console.log(`✅ Authenticated as: ${accountDetails.email}`);
    console.log('📋 Account details:', JSON.stringify(accountDetails, null, 2));

    // Ensure account_id exists (handle different possible field names)
    const accountId = (accountDetails.account_id || accountDetails.accountId || accountDetails.id)?.toString();
    if (!accountId) {
      throw new Error('Account ID not found in user details. Available fields: ' + Object.keys(accountDetails).join(', '));
    }

    // Get all users from Cosmos DB via backend API
    const users = await backendAPI.getUsers();
    if (users.length === 0) {
      throw new Error('No users found. Please sync users first.');
    }

    // Convert dates to Unix timestamps (seconds for Trackimo API)
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    // Fetch events for the main account
    // Note: Events might be aggregated at the main account level
    const events = await trackimoClient.getEvents(
      accountId,
      fromTimestamp,
      toTimestamp
    );

    console.log(`📍 Fetched ${events.length} events`);
    result.totalEvents = events.length;

    // Transform events to include deviceId and convert id to string for Cosmos DB
    const transformedEvents = events.map((event) => ({
      ...event,
      id: event.id.toString(), // Cosmos DB requires id as string
      deviceId: event.device_id, // Add camelCase version for backend compatibility
    })) as any[];

    // Save raw events to Cosmos DB via backend API
    await backendAPI.saveEvents(transformedEvents);
    result.savedEvents = events.length;
    console.log(`💾 Saved ${events.length} raw events to Cosmos DB`);

    // Process events into walks
    const walks = processEventsIntoWalks(events);
    console.log(`🚶 Processed ${walks.length} walks`);
    result.processedWalks = walks.length;

    // Create device ID to user mapping
    const deviceToUserMap = new Map<string, { userId: string; nif: string }>();
    users.forEach((user: User) => {
      // Map ALL device IDs to this user
      const allDevices = user.devices || [];
      allDevices.forEach((device: Device) => {
        if (device.id) {
          deviceToUserMap.set(device.id, {
            userId: user.id,
            nif: user.nif,
          });
        }
      });
      
      // Also add primary deviceId for backward compatibility
      if (user.deviceId && !deviceToUserMap.has(user.deviceId)) {
        deviceToUserMap.set(user.deviceId, {
          userId: user.id,
          nif: user.nif,
        });
      }
    });

    // Map walks to users
    const mappedWalks = mapWalksToUsers(walks, deviceToUserMap);

    console.log(`📊 Device to User mapping entries:`);
    deviceToUserMap.forEach((value, key) => {
      console.log(`   deviceId: "${key}" -> userId: ${value.userId}, nif: ${value.nif}`);
    });
    console.log(`📊 Sample walk deviceIds:`);
    walks.slice(0, 3).forEach(w => {
      console.log(`   Walk deviceId: "${w.deviceId}" (type: ${typeof w.deviceId})`);
    });
    console.log(`📊 Total walks to save: ${mappedWalks.length}`);
    console.log(`📊 Walks with userId: ${mappedWalks.filter(w => w.userId).length}`);
    console.log(`📊 Walks without userId: ${mappedWalks.filter(w => !w.userId).length}`);

    // Save walks to Cosmos DB via backend API
    for (const walk of mappedWalks) {
      if (walk.userId) {
        try {
          console.log(`💾 Saving walk ${walk.id} for user ${walk.userId} (device: ${walk.deviceId})`);
          await backendAPI.saveWalk(walk);
          result.savedWalks++;
        } catch (error) {
          console.error(`❌ Error saving walk ${walk.id}:`, error);
          // Note: We don't have an errors array for walks in the result, just log it
        }
      } else {
        console.warn(`⚠️ Walk ${walk.id} has no user mapping (deviceId: ${walk.deviceId}, petName: ${walk.petName})`);
      }
    }

    console.log(`💾 Saved ${result.savedWalks} walks to Cosmos DB`);

    // Calculate challenges for the period
    const month = fromDate.getMonth() + 1;
    const year = fromDate.getFullYear();

    console.log(`🎯 Calculating challenges for ${month}/${year}...`);

    // Get all walks from Cosmos DB (including previously saved ones)
    const allWalks = await backendAPI.getWalks();

    // Calculate challenges for each user
    for (const user of users) {
      try {
        const challenges = calculateAllChallengesForMonth(allWalks, [user], month, year);

        // Save challenges to Cosmos DB via backend API
        for (const challenge of challenges) {
          await backendAPI.saveChallenge(challenge);
          result.processedChallenges++;
        }

        // Update user stats (walks and completed challenges count)
        const userWalks = allWalks.filter((w: any) => w.userId === user.id && w.isValid);
        const completedChallenges = challenges.filter((c) => c.status === 'completed');

        // Update user with new stats
        const updatedUser: User = {
          ...user,
          totalWalks: userWalks.length,
          totalChallengesCompleted: completedChallenges.length,
        };
        await backendAPI.saveUser(updatedUser);
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
