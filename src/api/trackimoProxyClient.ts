import axios, { AxiosInstance } from 'axios';
import type {
  TrackimoAccountResponse,
  TrackimoDevice,
  TrackimoEvent,
} from '@/types';

/**
 * Simplified Trackimo API Client using server-side proxy
 * This avoids CORS issues by routing all requests through /api/trackimo-proxy
 */
export class TrackimoProxyClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: '/api',
      timeout: 60000, // 60 seconds (server does OAuth flow)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ Proxy Success: ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Proxy Error:', {
          endpoint: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a request through the trackimo-proxy endpoint
   */
  private async proxyRequest<T>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.get('/trackimo-proxy', {
      params: { endpoint },
    });
    return response.data;
  }

  /**
   * Get user account information
   */
  async getUserAccount(): Promise<TrackimoAccountResponse> {
    console.log('📱 Getting user account...');
    return this.proxyRequest<TrackimoAccountResponse>('/api/v3/user');
  }

  /**
   * Get descendant accounts (sub-accounts)
   */
  async getDescendants(accountId: string): Promise<{ descendants: any[] }> {
    console.log(`📱 Getting descendants for account ${accountId}...`);
    return this.proxyRequest<{ descendants: any[] }>(
      `/api/v4/accounts/${accountId}/descendants`
    );
  }

  /**
   * Get devices for an account
   */
  async getDevices(accountId: string): Promise<TrackimoDevice[]> {
    console.log(`📱 Getting devices for account ${accountId}...`);
    return this.proxyRequest<TrackimoDevice[]>(
      `/api/v3/accounts/${accountId}/devices`
    );
  }

  /**
   * Get events for an account within a date range
   */
  async getEvents(
    accountId: string,
    fromTimestamp: number,
    toTimestamp: number,
    alarmTypes: string = 'GEOZONE_ENTRY,GEOZONE_EXIT'
  ): Promise<TrackimoEvent[]> {
    console.log(
      `📱 Getting events for account ${accountId} from ${new Date(fromTimestamp * 1000).toISOString()} to ${new Date(toTimestamp * 1000).toISOString()}...`
    );
    
    const endpoint = `/api/v3/accounts/${accountId}/events_with_date_range?alarm_types=${alarmTypes}&from=${fromTimestamp}&to=${toTimestamp}&sort_direction=asc&page=1&limit=1000`;
    
    return this.proxyRequest<TrackimoEvent[]>(endpoint);
  }

  /**
   * Get device location history
   */
  async getLocationHistory(
    accountId: string,
    deviceId: string,
    fromTimestamp: number,
    toTimestamp: number
  ): Promise<any[]> {
    console.log(
      `📍 Getting location history for device ${deviceId} from ${new Date(fromTimestamp * 1000).toISOString()} to ${new Date(toTimestamp * 1000).toISOString()}...`
    );
    
    const endpoint = `/api/v3/accounts/${accountId}/devices/${deviceId}/locations?from=${fromTimestamp}&to=${toTimestamp}&sort_direction=asc&page=1&limit=1000`;
    
    return this.proxyRequest<any[]>(endpoint);
  }

  /**
   * Get geozones for an account
   */
  async getGeozones(accountId: string): Promise<any[]> {
    console.log(`🗺️ Getting geozones for account ${accountId}...`);
    return this.proxyRequest<any[]>(
      `/api/v3/accounts/${accountId}/geozones`
    );
  }

  /**
   * Convert datetime to UTC timestamp (helper method)
   */
  getTimestampInUTC(year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0): number {
    const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));
    return Math.floor(dt.getTime() / 1000);
  }
}

// Export singleton instance
export const trackimoClient = new TrackimoProxyClient();
