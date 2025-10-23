import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Debug endpoint to check available environment variables
 * TEMPORARY - Remove after debugging
 */
export async function debugEnv(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('HTTP trigger function processed a request for debug-env');

  try {
    // Get all environment variable names (not values for security)
    const envKeys = Object.keys(process.env).filter(key => 
      key.includes('TRACKIMO') || key.includes('COSMOS') || key.includes('VITE')
    );

    // Show which keys exist and if they have values
    const envStatus = envKeys.reduce((acc, key) => {
      acc[key] = process.env[key] ? `SET (${process.env[key]?.substring(0, 3)}...)` : 'EMPTY';
      return acc;
    }, {} as Record<string, string>);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Environment variables status',
        trackimoVarsFound: envKeys.length,
        variables: envStatus,
        allEnvKeysCount: Object.keys(process.env).length,
      }, null, 2),
    };
  } catch (error) {
    context.error('Error checking env:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: 'Failed to check environment variables' }),
    };
  }
}

app.http('debugEnv', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: debugEnv,
});
