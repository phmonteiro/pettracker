import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosService } from '../cosmosService';

export async function SaveEvents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    await cosmosService.initializeDatabase();
    const container = cosmosService.getContainer('Events');
    
    const events = await request.json();
    
    // Validate it's an array
    if (!Array.isArray(events)) {
      return {
        status: 400,
        jsonBody: { error: 'Expected an array of events' }
      };
    }
    
    // Validate each event has required fields
    for (const event of events) {
      if (!event.id || !event.deviceId) {
        return {
          status: 400,
          jsonBody: { error: 'Each event must have id and deviceId' }
        };
      }
    }
    
    // Bulk upsert all events
    const savedEvents = [];
    for (const event of events) {
      const { resource } = await container.items.upsert(event);
      savedEvents.push(resource);
    }
    
    return {
      status: 200,
      jsonBody: {
        message: `Successfully saved ${savedEvents.length} events`,
        events: savedEvents
      }
    };
  } catch (error) {
    context.error('Error saving events:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to save events', details: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

app.http('SaveEvents', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'events',
  handler: SaveEvents
});
