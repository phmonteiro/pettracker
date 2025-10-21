import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function SaveChallenge(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await cosmosService.initializeDatabase();
    const container = cosmosService.getContainer('Challenges');
    
    const challenge = await request.json() as any;
    
    // Validate required fields
    if (!challenge.id || !challenge.userId) {
      return {
        status: 400,
        jsonBody: { error: 'Challenge must have id and userId' }
      };
    }
    
    // Upsert the challenge (create or update)
    const { resource } = await container.items.upsert(challenge);
    
    return {
      status: 200,
      jsonBody: resource
    };
  } catch (error) {
    context.error('Error saving challenge:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to save challenge', details: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

app.http('SaveChallenge', {
  methods: ['POST', 'PUT'],
  authLevel: 'anonymous',
  route: 'challenges',
  handler: SaveChallenge
});
