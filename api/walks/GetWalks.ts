import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function GetWalks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GetWalks function triggered');

  try {
    const userId = request.query.get('userId');
    const container = cosmosService.getContainer('Walks');

    if (userId) {
      // Filter by userId
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startTime DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: walks } = await container.items.query(querySpec).fetchAll();
      return {
        status: 200,
        jsonBody: walks
      };
    } else {
      // Get all walks
      const { resources: walks } = await container.items.readAll().fetchAll();
      return {
        status: 200,
        jsonBody: walks
      };
    }
  } catch (error: any) {
    context.error('Error fetching walks:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch walks', message: error.message }
    };
  }
}

app.http('GetWalks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'walks',
  handler: GetWalks
});
