import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function SaveWalk(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('SaveWalk function triggered');

  try {
    const walk = await request.json() as any;
    
    if (!walk || !walk.id || !walk.userId) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid walk data. id and userId are required.' }
      };
    }

    const container = cosmosService.getContainer('Walks');
    const { resource } = await container.items.upsert(walk);

    return {
      status: 200,
      jsonBody: resource
    };
  } catch (error: any) {
    context.error('Error saving walk:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to save walk', message: error.message }
    };
  }
}

app.http('SaveWalk', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  route: 'walks',
  handler: SaveWalk
});
