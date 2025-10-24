import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

/**
 * Trackimo API Proxy - Server-side authentication and API calls
 * This avoids CORS issues and handles OAuth flow server-side
 */

interface TrackimoAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Token cache (in-memory, will reset on function restart)
let tokenCache: {
  token: string | null;
  expiry: number | null;
} = {
  token: null,
  expiry: null,
};

/**
 * Authenticate with Trackimo API and get access token
 */
async function getTrackimoAccessToken(context: InvocationContext): Promise<string> {
  // Check cache
  if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
    context.log('Using cached Trackimo token');
    return tokenCache.token;
  }

  context.log('Authenticating with Trackimo API...');

  const username = process.env.TRACKIMO_USERNAME;
  const password = process.env.TRACKIMO_PASSWORD;
  const clientId = process.env.TRACKIMO_CLIENT_ID;
  const clientSecret = process.env.TRACKIMO_CLIENT_SECRET;
  const redirectUri = process.env.TRACKIMO_REDIRECT_URI;
  const apiUrl = process.env.TRACKIMO_API_URL || 'https://fidelidade.trackimo.com';

  if (!username || !password || !clientId || !clientSecret) {
    throw new Error('Missing Trackimo credentials in environment variables');
  }

  try {
    // Step 1: Login to get session cookies
    context.log('Step 1: Logging in to Trackimo...');
    const loginResponse = await axios.post(
      `${apiUrl}/api/internal/v2/user/login`,
      {
        username,
        password,
        whitelabel: 'FIDELIDADE',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Accept any status to debug
      }
    );

    context.log('Login response status:', loginResponse.status);
    context.log('Login response headers:', JSON.stringify(loginResponse.headers));

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.data)}`);
    }

    // Extract cookies - handle both array and string formats
    // This matches Python's dict(resp.cookies) behavior
    const setCookieHeaders = loginResponse.headers['set-cookie'] as string[] | string | undefined;
    let cookies = '';
    
    if (Array.isArray(setCookieHeaders)) {
      // Array format: ['session=abc; Path=/; HttpOnly', 'token=xyz; Path=/']
      // Extract just the name=value pairs, strip attributes
      cookies = setCookieHeaders
        .map(cookie => {
          // Get the first part before the first semicolon (the name=value pair)
          const nameValue = cookie.split(';')[0].trim();
          return nameValue;
        })
        .filter(c => c.length > 0)  // Remove empty strings
        .join('; ');
    } else if (setCookieHeaders && typeof setCookieHeaders === 'string') {
      // String format: 'session=abc; Path=/; HttpOnly'
      cookies = setCookieHeaders.split(';')[0].trim();
    }

    context.log('Extracted cookies:', cookies ? 'SET' : 'EMPTY');
    context.log('Cookies to send:', cookies);

    if (!cookies) {
      throw new Error('No session cookies received from login. Check credentials and Trackimo API status.');
    }

    // Step 2: Get authorization code
    context.log('Step 2: Getting authorization code...');
    const authResponse = await axios.get(`${apiUrl}/api/v3/oauth2/auth`, {
      params: {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'locations,notifications,devices,accounts,settings,geozones',
      },
      headers: {
        Cookie: cookies,
        'User-Agent': 'PetTracker-Proxy/1.0',
      },
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 200,
    });

    context.log('Auth response status:', authResponse.status);
    context.log('Auth response headers:', JSON.stringify(authResponse.headers));

    let code: string;
    if (authResponse.status === 302) {
      const location = authResponse.headers['location'];
      code = location.split('=')[1];
    } else if (authResponse.data?.code) {
      code = authResponse.data.code;
    } else {
      throw new Error('Could not get authorization code');
    }

    // Step 3: Exchange code for access token
    const tokenResponse = await axios.post<TrackimoAuthResponse>(
      `${apiUrl}/api/v3/oauth2/token`,
      {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies,
        },
      }
    );

    const token = tokenResponse.data.access_token;
    
    // Cache token for 50 minutes (expires in 1 hour)
    tokenCache.token = token;
    tokenCache.expiry = Date.now() + 50 * 60 * 1000;

    context.log('Successfully authenticated with Trackimo');
    return token;
  } catch (error: any) {
    context.error('Trackimo authentication failed:', error.message);
    throw error;
  }
}

/**
 * Proxy endpoint for Trackimo API calls
 * Usage: GET /api/trackimo-proxy?endpoint=/api/v3/user
 */
export async function trackimoProxy(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Trackimo proxy request:', request.method, request.url);

  try {
    const endpoint = request.query.get('endpoint');
    if (!endpoint) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'Missing endpoint parameter' }),
      };
    }

    // Get access token
    const token = await getTrackimoAccessToken(context);

    const apiUrl = process.env.TRACKIMO_API_URL || 'https://fidelidade.trackimo.com';
    const fullUrl = `${apiUrl}${endpoint}`;

    // Get query parameters but exclude 'endpoint' parameter
    const queryParams: Record<string, string> = {};
    for (const [key, value] of request.query.entries()) {
      if (key !== 'endpoint') {
        queryParams[key] = value;
      }
    }

    context.log(`Proxying request to: ${fullUrl}`);
    if (Object.keys(queryParams).length > 0) {
      context.log(`Query params:`, queryParams);
    }

    // Forward the request to Trackimo API
    const response = await axios({
      method: request.method as any,
      url: fullUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      data: request.body ? await request.text() : undefined,
      validateStatus: () => true, // Don't throw on any status
    });

    // Log response details for debugging
    context.log(`Response status: ${response.status}`);
    context.log(`Response content-type: ${response.headers['content-type']}`);
    
    // Check if response is HTML (error page)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      context.error(`Trackimo returned HTML instead of JSON. Status: ${response.status}`);
      context.error(`Response preview: ${JSON.stringify(response.data).substring(0, 500)}`);
      return {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Trackimo API returned HTML instead of JSON',
          status: response.status,
          message: 'The Trackimo API may be experiencing issues or the endpoint is incorrect',
        }),
      };
    }

    if (response.status >= 400) {
      context.error(`Trackimo API error: ${response.status}`);
      return {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response.data),
      };
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    context.error('Trackimo proxy error:', error.message);
    return {
      status: error.response?.status || 500,
      body: JSON.stringify({
        error: 'Trackimo API error',
        message: error.message,
        details: error.response?.data,
      }),
    };
  }
}

app.http('trackimo-proxy', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: trackimoProxy,
});
