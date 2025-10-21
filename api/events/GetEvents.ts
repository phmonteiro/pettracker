import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function GetEvents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await cosmosService.initializeDatabase();
    const container = cosmosService.getContainer('Events');
    
    const deviceId = request.query.get('deviceId');
    const startDate = request.query.get('startDate');
    const endDate = request.query.get('endDate');
    
    let events;
    if (deviceId || startDate) {
      // Build query with filters
      let queryText = 'SELECT * FROM c WHERE 1=1';
      const parameters: any[] = [];
      
      if (deviceId) {
        queryText += ' AND c.deviceId = @deviceId';
        parameters.push({ name: '@deviceId', value: deviceId });
      }
      
      if (startDate) {
        queryText += ' AND c.timestamp >= @startDate';
        parameters.push({ name: '@startDate', value: startDate });
      }
      
      if (endDate) {
        queryText += ' AND c.timestamp <= @endDate';
        parameters.push({ name: '@endDate', value: endDate });
      }
      
      queryText += ' ORDER BY c.timestamp DESC';
      
      const query = { query: queryText, parameters };
      const { resources } = await container.items.query(query).fetchAll();
      events = resources;
    } else {
      // Get all events
      const { resources } = await container.items.readAll().fetchAll();
      events = resources;
    }
    
    return {
      status: 200,
      jsonBody: events
    };
  } catch (error) {
    context.error('Error fetching events:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

app.http('GetEvents', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'events',
  handler: GetEvents
});
