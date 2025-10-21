import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function SaveUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('SaveUser function triggered');

  try {
    const user = await request.json() as any;
    
    if (!user || !user.nif) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid user data. NIF is required.' }
      };
    }

    const container = cosmosService.getContainer('Users');
    const { resource } = await container.items.upsert(user);

    return {
      status: 200,
      jsonBody: resource,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error: any) {
    context.error('Error saving user:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to save user', message: error.message }
    };
  }
}

app.http('SaveUser', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  route: 'users',
  handler: SaveUser
});
