"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveUser = SaveUser;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function SaveUser(request, context) {
    context.log('SaveUser function triggered');
    try {
        const user = await request.json();
        if (!user || !user.nif) {
            return {
                status: 400,
                jsonBody: { error: 'Invalid user data. NIF is required.' }
            };
        }
        const container = cosmosService_1.cosmosService.getContainer('Users');
        const { resource } = await container.items.upsert(user);
        return {
            status: 200,
            jsonBody: resource,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.error('Error saving user:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to save user', message: error.message }
        };
    }
}
functions_1.app.http('SaveUser', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'users',
    handler: SaveUser
});
//# sourceMappingURL=SaveUser.js.map