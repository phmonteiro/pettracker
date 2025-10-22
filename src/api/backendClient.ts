/**
 * Backend API Client for Pet Tracker
 * Connects React frontend to Azure Functions API
 */

import type { User, Walk, Challenge, TrackimoEvent } from '../types';

// Use relative path for production (Azure Static Web Apps automatically routes /api to Azure Functions)
// Use localhost for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:7071/api' : '/api'
);

class BackendAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Helper method for API calls
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Users API
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async saveUser(user: User): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(nif: string): Promise<void> {
    await this.request(`/users/${nif}`, {
      method: 'DELETE',
    });
  }

  // Walks API
  async getWalks(userId?: string): Promise<Walk[]> {
    const queryParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.request<Walk[]>(`/walks${queryParam}`);
  }

  async saveWalk(walk: Walk): Promise<Walk> {
    return this.request<Walk>('/walks', {
      method: 'POST',
      body: JSON.stringify(walk),
    });
  }

  // Challenges API
  async getChallenges(userId?: string): Promise<Challenge[]> {
    const queryParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return this.request<Challenge[]>(`/challenges${queryParam}`);
  }

  async saveChallenge(challenge: Challenge): Promise<Challenge> {
    return this.request<Challenge>('/challenges', {
      method: 'POST',
      body: JSON.stringify(challenge),
    });
  }

  // Events API
  async getEvents(filters?: {
    deviceId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TrackimoEvent[]> {
    const params = new URLSearchParams();
    if (filters?.deviceId) params.append('deviceId', filters.deviceId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const endpoint = `/events${queryString ? `?${queryString}` : ''}`;
    return this.request<TrackimoEvent[]>(endpoint);
  }

  async saveEvents(events: TrackimoEvent[]): Promise<{ message: string; events: TrackimoEvent[] }> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(events),
    });
  }
}

// Export singleton instance
export const backendAPI = new BackendAPIClient();

// Export class for testing
export { BackendAPIClient };
