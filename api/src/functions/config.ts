import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Get runtime configuration
 * Returns non-sensitive configuration values that the frontend needs
 */
export async function config(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request for config');

  try {
    // Return configuration from environment variables
    // These are runtime values from Azure Static Web App settings
    // Try both VITE_ prefix (for compatibility) and without prefix (for Azure Functions)
    const config = {
      trackimo: {
        username: process.env.TRACKIMO_USERNAME || process.env.VITE_TRACKIMO_USERNAME || '',
        password: process.env.TRACKIMO_PASSWORD || process.env.VITE_TRACKIMO_PASSWORD || '',
        apiUrl: process.env.TRACKIMO_API_URL || process.env.VITE_TRACKIMO_API_URL || 'https://fidelidade.trackimo.com',
        clientId: process.env.TRACKIMO_CLIENT_ID || process.env.VITE_TRACKIMO_CLIENT_ID || '',
        clientSecret: process.env.TRACKIMO_CLIENT_SECRET || process.env.VITE_TRACKIMO_CLIENT_SECRET || '',
        redirectUri: process.env.TRACKIMO_REDIRECT_URI || process.env.VITE_TRACKIMO_REDIRECT_URI || '',
      }
    };
    
    // Log what we found (without sensitive values)
    context.log('Config check:', {
      hasUsername: !!config.trackimo.username,
      hasPassword: !!config.trackimo.password,
      hasClientId: !!config.trackimo.clientId,
      hasClientSecret: !!config.trackimo.clientSecret,
      apiUrl: config.trackimo.apiUrl,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    };
  } catch (error) {
    context.error('Error getting config:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to get configuration' }),
    };
  }
}

app.http('config', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: config,
});
