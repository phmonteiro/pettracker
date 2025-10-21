"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUsers = GetUsers;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function GetUsers(request, context) {
    context.log('GetUsers function triggered');
    try {
        const container = cosmosService_1.cosmosService.getContainer('Users');
        const { resources: users } = await container.items.readAll().fetchAll();
        return {
            status: 200,
            jsonBody: users,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.error('Error fetching users:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to fetch users', message: error.message }
        };
    }
}
functions_1.app.http('GetUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'users',
    handler: GetUsers
});
//# sourceMappingURL=GetUsers.js.map