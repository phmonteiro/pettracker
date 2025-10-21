import { v4 as uuidv4 } from 'uuid';
import type { TrackimoEvent, Walk } from '@/types';
import { MIN_WALK_DURATION_SECONDS } from '@/types';

/**
 * Walk Processing Utilities
 * Processes Trackimo events into walks
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Process raw events into walks
 * A walk is:
 * 1. EXIT event (start)
 * 2. Followed by ENTRY event (end)
 * 3. Same device
 * 4. Same geozone
 * 5. Minimum duration: 10 minutes
 */
export function processEventsIntoWalks(events: TrackimoEvent[]): Walk[] {
  // Sort events by creation time
  const sortedEvents = [...events].sort((a, b) => a.created - b.created);

  const walks: Walk[] = [];
  const pendingExits: Map<string, TrackimoEvent> = new Map();

  sortedEvents.forEach((event) => {
    const deviceKey = `${event.device_id}_${event.geozone_name}`;

    if (event.alarm_type === 'GEOZONE_EXIT') {
      // Store EXIT event, waiting for matching ENTRY
      pendingExits.set(deviceKey, event);
    } else if (event.alarm_type === 'GEOZONE_ENTRY') {
      // Check if we have a matching EXIT event
      const exitEvent = pendingExits.get(deviceKey);

      if (exitEvent) {
        // Calculate duration
        const durationMs = event.created - exitEvent.created;
        const durationSeconds = Math.floor(durationMs / 1000);
        const durationMinutes = Math.floor(durationSeconds / 60);

        // Calculate distance
        const distance = haversineDistance(
          exitEvent.lat,
          exitEvent.lng,
          event.lat,
          event.lng
        );

        // Create walk
        const walk: Walk = {
          id: uuidv4(),
          userId: '', // Will be set later when mapping to users
          nif: '', // Will be set later
          petName: event.device_name,
          deviceId: event.device_id.toString(),
          geozoneName: event.geozone_name,
          exitEvent,
          entryEvent: event,
          startTime: new Date(exitEvent.created).toISOString(),
          endTime: new Date(event.created).toISOString(),
          durationMinutes,
          durationSeconds,
          isValid: durationSeconds >= MIN_WALK_DURATION_SECONDS,
          distance,
          exitLat: exitEvent.lat,
          exitLng: exitEvent.lng,
          entryLat: event.lat,
          entryLng: event.lng,
          createdAt: new Date().toISOString(),
        };

        walks.push(walk);

        // Remove the pending exit
        pendingExits.delete(deviceKey);
      }
    }
  });

  console.log(`✅ Processed ${events.length} events into ${walks.length} walks`);
  console.log(`   Valid walks (>= 10 min): ${walks.filter((w) => w.isValid).length}`);
  console.log(`   Invalid walks (< 10 min): ${walks.filter((w) => !w.isValid).length}`);

  return walks;
}

/**
 * Map walks to users based on device ID
 */
export function mapWalksToUsers(walks: Walk[], deviceToUserMap: Map<string, { userId: string; nif: string }>): Walk[] {
  return walks.map((walk) => {
    const userMapping = deviceToUserMap.get(walk.deviceId);
    
    if (userMapping) {
      return {
        ...walk,
        userId: userMapping.userId,
        nif: userMapping.nif,
      };
    }
    
    return walk;
  });
}

/**
 * Filter walks by date range
 */
export function filterWalksByDateRange(walks: Walk[], startDate: Date, endDate: Date): Walk[] {
  return walks.filter((walk) => {
    const walkDate = new Date(walk.startTime);
    return walkDate >= startDate && walkDate <= endDate;
  });
}

/**
 * Get walks grouped by user
 */
export function groupWalksByUser(walks: Walk[]): Map<string, Walk[]> {
  const grouped = new Map<string, Walk[]>();

  walks.forEach((walk) => {
    if (!walk.userId) return;

    if (!grouped.has(walk.userId)) {
      grouped.set(walk.userId, []);
    }

    grouped.get(walk.userId)!.push(walk);
  });

  return grouped;
}

/**
 * Get walks grouped by month
 */
export function groupWalksByMonth(walks: Walk[]): Map<string, Walk[]> {
  const grouped = new Map<string, Walk[]>();

  walks.forEach((walk) => {
    const date = new Date(walk.startTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }

    grouped.get(monthKey)!.push(walk);
  });

  return grouped;
}

/**
 * Calculate statistics for a set of walks
 */
export interface WalkStatistics {
  totalWalks: number;
  validWalks: number;
  invalidWalks: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  totalDistance: number;
  averageDistance: number;
  longestWalk: Walk | null;
  shortestValidWalk: Walk | null;
}

export function calculateWalkStatistics(walks: Walk[]): WalkStatistics {
  const validWalks = walks.filter((w) => w.isValid);

  const totalDurationMinutes = validWalks.reduce((sum, w) => sum + w.durationMinutes, 0);
  const totalDistance = validWalks.reduce((sum, w) => sum + (w.distance || 0), 0);

  const longestWalk = validWalks.length > 0
    ? validWalks.reduce((max, w) => (w.durationMinutes > max.durationMinutes ? w : max))
    : null;

  const shortestValidWalk = validWalks.length > 0
    ? validWalks.reduce((min, w) => (w.durationMinutes < min.durationMinutes ? w : min))
    : null;

  return {
    totalWalks: walks.length,
    validWalks: validWalks.length,
    invalidWalks: walks.length - validWalks.length,
    totalDurationMinutes,
    averageDurationMinutes: validWalks.length > 0 ? totalDurationMinutes / validWalks.length : 0,
    totalDistance,
    averageDistance: validWalks.length > 0 ? totalDistance / validWalks.length : 0,
    longestWalk,
    shortestValidWalk,
  };
}
