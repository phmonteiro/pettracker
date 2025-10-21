import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function GetUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GetUsers function triggered');

  try {
    const container = cosmosService.getContainer('Users');
    const { resources: users } = await container.items.readAll().fetchAll();

    return {
      status: 200,
      jsonBody: users,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error: any) {
    context.error('Error fetching users:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch users', message: error.message }
    };
  }
}

app.http('GetUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: GetUsers
});
