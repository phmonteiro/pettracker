import axios, { AxiosInstance, AxiosError } from 'axios';
import pRetry from 'p-retry';
import type {
  TrackimoConfig,
  TokenCache,
  TrackimoAuthResponse,
  TrackimoAccountResponse,
  TrackimoDescendantAccount,
  TrackimoDevice,
  TrackimoEvent,
} from '@/types';

/**
 * Rate Limiter to prevent exceeding API rate limits
 */
class RateLimiter {
  private lastCalled: number = 0;
  private minInterval: number;

  constructor(callsPerMinute: number = 60) {
    this.minInterval = (60 * 1000) / callsPerMinute;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const elapsed = Date.now() - this.lastCalled;
    const waitTime = this.minInterval - elapsed;

    if (waitTime > 0) {
      console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const result = await fn();
    this.lastCalled = Date.now();
    return result;
  }
}

/**
 * Trackimo API Client
 * Implements token caching, retry logic, rate limiting, and comprehensive error handling
 */
export class TrackimoAPIClient {
  private config: TrackimoConfig;
  private axiosInstance: AxiosInstance;
  private tokenCache: TokenCache = {
    accessToken: null,
    tokenExpiry: null,
    accountId: null,
  };
  private rateLimiter: RateLimiter;

  constructor(config: TrackimoConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize rate limiter (30 calls per minute as per recommendations)
    this.rateLimiter = new RateLimiter(30);

    // Add request interceptor to add token to authenticated requests
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Skip token for authentication endpoints
        const authEndpoints = ['/login', '/oauth', '/oauth2'];
        const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
        
        if (isAuthEndpoint) {
          console.log(`🔓 Skipping token for auth endpoint: ${config.url}`);
          return config;
        }

        // Add bearer token to other requests
        if (this.tokenCache.accessToken) {
          console.log(`🔑 Adding Bearer token to request: ${config.url}`);
          config.headers.Authorization = `Bearer ${this.tokenCache.accessToken}`;
        } else {
          console.warn(`⚠️ No token available for request: ${config.url}`);
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Log API errors with detailed context
   */
  private logApiError(error: AxiosError): void {
    if (error.response) {
      console.error('❌ API Error:', {
        endpoint: error.config?.url,
        method: error.config?.method,
        statusCode: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('❌ Network Error:', {
        endpoint: error.config?.url,
        message: 'No response received from server',
      });
    } else {
      console.error('❌ Request Setup Error:', error.message);
    }
  }

  /**
   * Get valid access token (with caching)
   */
  async getValidToken(): Promise<string> {
    // If Bearer token is provided in config, use it directly
    if (this.config.bearerToken) {
      console.log('🔑 Using pre-configured Bearer token');
      return this.config.bearerToken;
    }

    // Check if we have a valid cached token
    if (
      this.tokenCache.accessToken &&
      this.tokenCache.tokenExpiry &&
      this.tokenCache.tokenExpiry > new Date()
    ) {
      console.log('🔑 Using cached access token');
      return this.tokenCache.accessToken;
    }

    console.log('🔑 Token expired or missing, authenticating...');
    const token = await this.doLoginAndGetAccessToken();
    
    // Cache token for 1 hour
    this.tokenCache.accessToken = token;
    this.tokenCache.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    
    return token;
  }

  /**
   * Invalidate cached token (force refresh on next request)
   */
  invalidateToken(): void {
    this.tokenCache.accessToken = null;
    this.tokenCache.tokenExpiry = null;
    this.tokenCache.accountId = null;
    console.log('🔑 Token cache invalidated');
  }

  /**
   * Authenticate and obtain OAuth access token using Fidelidade's 3-step flow
   * Step 1: POST /api/internal/v2/user/login (get cookies)
   * Step 2: GET /api/v3/oauth2/auth (get authorization code)
   * Step 3: POST /api/v3/oauth2/token (exchange code for access token)
   */
  private async doLoginAndGetAccessToken(): Promise<string> {
    return this.rateLimiter.execute(async () => {
      return pRetry(
        async () => {
          console.log('🚀 Authenticating with Trackimo API (3-step OAuth flow)...');
          
          // Step 1: Login and get cookies
          console.log('📝 Step 1: Logging in to get session cookies...');
          let loginResponse;
          try {
            loginResponse = await this.axiosInstance.post(
              '/api/internal/v2/user/login',
              {
                username: this.config.username,
                password: this.config.password,
                whitelabel: 'FIDELIDADE',
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          } catch (error) {
            console.error('❌ Step 1 failed:', error);
            throw error;
          }

          if (loginResponse.status !== 200) {
            throw new Error(`Login failed with status ${loginResponse.status}`);
          }

          // Extract cookies from response
          const cookies = loginResponse.headers['set-cookie'];
          if (!cookies || cookies.length === 0) {
            console.warn('⚠️ No set-cookie headers found, trying alternative cookie extraction...');
            // In browser environment, cookies might be handled automatically
            // Continue anyway as the session might be established
          }

          console.log('✅ Step 1 complete: Session cookies obtained', cookies ? `(${cookies.length} cookies)` : '(auto-handled)');

          // Step 2: Get authorization code
          console.log('🔑 Step 2: Getting authorization code...');
          const authHeaders: any = {};
          if (cookies && cookies.length > 0) {
            authHeaders.Cookie = cookies.join('; ');
          }
          
          const authResponse = await this.axiosInstance.get('/api/v3/oauth2/auth', {
            params: {
              client_id: this.config.clientId,
              redirect_uri: this.config.redirectUri,
              response_type: 'code',
              scope: 'locations,notifications,devices,accounts,settings,geozones',
            },
            headers: authHeaders,
            maxRedirects: 0,
            validateStatus: (status) => status === 302 || status === 200,
          });

          console.log(`   Auth response status: ${authResponse.status}`);

          let code: string;
          
          if (authResponse.status === 302) {
            // Standard OAuth redirect flow
            const location = authResponse.headers['location'];
            if (!location) {
              throw new Error('No redirect location in authorization response');
            }
            code = location.split('=')[1];
          } else if (authResponse.status === 200) {
            // Direct response with code in body or response
            console.log('   Checking response body for authorization code...');
            
            // Check if code is in response data
            if (authResponse.data && typeof authResponse.data === 'object' && authResponse.data.code) {
              code = authResponse.data.code;
            } else if (authResponse.data && typeof authResponse.data === 'string') {
              // Try to extract code from HTML/text response
              const codeMatch = authResponse.data.match(/code=([^&"'\s]+)/);
              if (codeMatch) {
                code = codeMatch[1];
              } else {
                throw new Error('Could not extract authorization code from response');
              }
            } else {
              throw new Error('Authorization endpoint returned 200 but no code found');
            }
          } else {
            throw new Error(`Unexpected authorization response status: ${authResponse.status}`);
          }

          if (!code) {
            throw new Error('No authorization code obtained');
          }

          console.log('✅ Step 2 complete: Authorization code obtained');

          // Step 3: Exchange code for access token
          console.log('🎫 Step 3: Exchanging code for access token...');
          const tokenHeaders: any = {
            'Content-Type': 'application/json',
          };
          if (cookies && cookies.length > 0) {
            tokenHeaders.Cookie = cookies.join('; ');
          }
          
          const tokenResponse = await this.axiosInstance.post<TrackimoAuthResponse>(
            '/api/v3/oauth2/token',
            {
              client_id: this.config.clientId,
              client_secret: this.config.clientSecret,
              code: code,
            },
            {
              headers: tokenHeaders,
            }
          );

          if (tokenResponse.status !== 200 || !tokenResponse.data.access_token) {
            throw new Error('Failed to obtain access token');
          }

          console.log('✅ Step 3 complete: Access token obtained successfully!');
          return tokenResponse.data.access_token;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(
              `⚠️ Authentication attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
          },
        }
      );
    });
  }

  /**
   * Get current user account details
   * Endpoint: GET /api/v3/user
   */
  async getUserDetails(): Promise<TrackimoAccountResponse> {
    // Ensure we have a valid token before making the request
    await this.getValidToken();

    return this.rateLimiter.execute(async () => {
      return pRetry(
        async () => {
          console.log('👤 Fetching user details...');
          
          // The request interceptor will automatically add the Bearer token
          const response = await this.axiosInstance.get<TrackimoAccountResponse>(
            '/api/v3/user'
          );

          console.log('📋 Raw user response:', JSON.stringify(response.data, null, 2));

          // Cache account ID - try multiple possible field names
          const accountId = response.data.id || 
                           response.data.account_id || 
                           response.data.accountId ||
                           (response.data as any).userId ||
                           (response.data as any).user_id;
          
          if (accountId) {
            this.tokenCache.accountId = accountId;
            // Ensure the response has an id field
            response.data.id = accountId;
          }

          console.log(`✅ User details: ${response.data.email} (ID: ${accountId || 'NOT FOUND'})`);
          return response.data;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(
              `⚠️ Get user details attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
            
            // Invalidate token on 401
            if ((error as any).response?.status === 401) {
              this.invalidateToken();
            }
          },
        }
      );
    });
  }

  /**
   * Get account descendants (sub-accounts)
   * Endpoint: GET /api/v3/accounts/{accountId}/descendants
   */
  async getAccountDescendants(accountId?: string): Promise<TrackimoDescendantAccount[]> {
    // Ensure we have a valid token before making the request
    await this.getValidToken();
    const accId = accountId || this.tokenCache.accountId;

    if (!accId) {
      console.log('⚠️ No account ID provided, fetching user details to get account ID...');
      const userDetails = await this.getUserDetails();
      
      if (!userDetails.id) {
        throw new Error('Cannot get descendants: User details response does not contain an account ID. Please check the API response structure.');
      }
      
      return this.getAccountDescendants(userDetails.id);
    }

    return this.rateLimiter.execute(async () => {
      return pRetry(
        async () => {
          console.log(`📊 Fetching account descendants for account ${accId}...`);
          
          // The request interceptor will automatically add the Bearer token
          const response = await this.axiosInstance.get<TrackimoDescendantAccount[]>(
            `/api/v3/accounts/${accId}/descendants`
          );

          console.log('📋 Raw descendants response:', {
            status: response.status,
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            hasDescendantsField: !!(response.data as any)?.descendants,
            data: response.data,
          });

          // Handle undefined or null response
          if (!response.data) {
            console.warn('⚠️ Descendants endpoint returned undefined/null, returning empty array');
            return [];
          }

          // Extract descendants from nested structure
          let descendants: TrackimoDescendantAccount[] = [];
          
          if (Array.isArray(response.data)) {
            // Response is directly an array
            descendants = response.data;
          } else if ((response.data as any).descendants && Array.isArray((response.data as any).descendants)) {
            // Response has a descendants field
            descendants = (response.data as any).descendants;
          } else {
            console.warn('⚠️ Could not find descendants array in response, returning empty array');
          }
          
          console.log(`✅ Found ${descendants.length} descendant accounts`);
          return descendants;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(
              `⚠️ Get descendants attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
            
            if ((error as any).response?.status === 401) {
              this.invalidateToken();
            }
          },
        }
      );
    });
  }

  /**
   * Get devices for an account
   * Endpoint: GET /api/v3/accounts/{accountId}/devices
   */
  async getDevices(accountId: string): Promise<TrackimoDevice[]> {
    // Ensure we have a valid token before making the request
    await this.getValidToken();

    return this.rateLimiter.execute(async () => {
      return pRetry(
        async () => {
          console.log(`📱 Fetching devices for account ${accountId}...`);
          
          // The request interceptor will automatically add the Bearer token
          const response = await this.axiosInstance.get<TrackimoDevice[]>(
            `/api/v3/accounts/${accountId}/devices`
          );

          console.log(`✅ Found ${response.data.length} devices`);
          return response.data;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(
              `⚠️ Get devices attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
            
            if ((error as any).response?.status === 401) {
              this.invalidateToken();
            }
          },
        }
      );
    });
  }

  /**
   * Get events for an account within a date range
   * Endpoint: GET /api/v3/accounts/{accountId}/events
   */
  async getEvents(
    accountId: string,
    fromTimestamp: number,
    toTimestamp: number,
    deviceId?: number
  ): Promise<TrackimoEvent[]> {
    // Ensure we have a valid token before making the request
    await this.getValidToken();

    return this.rateLimiter.execute(async () => {
      return pRetry(
        async () => {
          console.log(`📍 Fetching events for account ${accountId}...`);
          console.log(`   From: ${new Date(fromTimestamp).toISOString()}`);
          console.log(`   To: ${new Date(toTimestamp).toISOString()}`);
          
          const params: any = {
            from: fromTimestamp,
            to: toTimestamp,
            types: 'GEOZONE_ENTRY,GEOZONE_EXIT',
            sort: 'created',
          };

          if (deviceId) {
            params.device_id = deviceId;
          }

          // The request interceptor will automatically add the Bearer token
          const response = await this.axiosInstance.get<TrackimoEvent[]>(
            `/api/v3/accounts/${accountId}/events`,
            {
              params,
            }
          );

          console.log(`✅ Found ${response.data.length} events`);
          return response.data;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
          onFailedAttempt: (error) => {
            console.warn(
              `⚠️ Get events attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
            
            if ((error as any).response?.status === 401) {
              this.invalidateToken();
            }
          },
        }
      );
    });
  }

  /**
   * Get events with pagination support for large datasets
   */
  async getAllEventsPaginated(
    accountId: string,
    fromTimestamp: number,
    toTimestamp: number,
    deviceId?: number
  ): Promise<TrackimoEvent[]> {
    // For now, Trackimo API might not support pagination
    // This is a placeholder for future implementation
    // We'll fetch all events in one call
    return this.getEvents(accountId, fromTimestamp, toTimestamp, deviceId);
  }
}

// Singleton instance
let apiClient: TrackimoAPIClient | null = null;

/**
 * Get or create Trackimo API client instance
 */
export function getTrackimoClient(): TrackimoAPIClient {
  if (!apiClient) {
    const config: TrackimoConfig = {
      bearerToken: import.meta.env.VITE_TRACKIMO_BEARER_TOKEN || '',
      username: import.meta.env.VITE_TRACKIMO_USERNAME || '',
      password: import.meta.env.VITE_TRACKIMO_PASSWORD || '',
      apiUrl: import.meta.env.VITE_TRACKIMO_API_URL || 'https://fidelidade.trackimo.com',
      clientId: import.meta.env.VITE_TRACKIMO_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_TRACKIMO_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_TRACKIMO_REDIRECT_URI || '',
    };

    console.log('🔧 Trackimo API Configuration:', {
      username: config.username,
      apiUrl: config.apiUrl,
      hasBearerToken: !!config.bearerToken,
      hasPassword: !!config.password,
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
    });

    apiClient = new TrackimoAPIClient(config);
  }

  return apiClient;
}

/**
 * Reset API client (useful for testing or changing credentials)
 */
export function resetTrackimoClient(): void {
  if (apiClient) {
    apiClient.invalidateToken();
  }
  apiClient = null;
}
