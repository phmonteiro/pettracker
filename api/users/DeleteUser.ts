import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function DeleteUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('DeleteUser function triggered');

  try {
    const nif = request.params.nif;
    
    if (!nif) {
      return {
        status: 400,
        jsonBody: { error: 'NIF parameter is required' }
      };
    }

    const container = cosmosService.getContainer('Users');
    await container.item(nif, nif).delete();

    return {
      status: 200,
      jsonBody: { message: 'User deleted successfully', nif }
    };
  } catch (error: any) {
    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: { error: 'User not found', nif: request.params.nif }
      };
    }
    
    context.error('Error deleting user:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to delete user', message: error.message }
    };
  }
}

app.http('DeleteUser', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'users/{nif}',
  handler: DeleteUser
});
