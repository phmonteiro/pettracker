import azure.functions as func
import logging
import json
from datetime import datetime, timezone
from shared.trackimo_api import TrackimoAPI
from shared.table_storage import get_table_client, create_tables_if_not_exist
from shared.data_processing import extract_nif_from_account_name

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('SyncUsers function started')
    
    try:
        # Create tables if they don't exist
        create_tables_if_not_exist()
        
        # Initialize Trackimo API
        api = TrackimoAPI()
        
        # Get access token
        access_token = api.do_login_and_get_access_token()
        if not access_token:
            return func.HttpResponse(
                json.dumps({"error": "Failed to authenticate with Trackimo API"}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Get user details
        user_details = api.get_user_details(access_token)
        if not user_details:
            return func.HttpResponse(
                json.dumps({"error": "Failed to get user details"}),
                status_code=500,
                mimetype="application/json"
            )
        
        # Get descendants (actual users)
        descendants = api.get_descendants(access_token, user_details['account_id'])
        if not descendants:
            return func.HttpResponse(
                json.dumps({"error": "Failed to get user descendants"}),
                status_code=500,
                mimetype="application/json"
            )
        
        # Process and save users
        users_table = get_table_client('Users')
        api_calls_table = get_table_client('ApiCalls')
        user_changes_table = get_table_client('UserChanges')
        
        processed_users = []
        
        # Get all existing users to detect removed ones
        existing_users = {}
        try:
            existing_user_entities = users_table.query_entities(query_filter="PartitionKey eq 'USER'")
            for user in existing_user_entities:
                existing_users[user['RowKey']] = user
        except Exception as e:
            logging.warning(f"Could not load existing users: {str(e)}")
        
        # Track which users are found in API response
        found_user_nifs = set()
        
        # Save API call log
        api_call_log = {
            'PartitionKey': 'SYNC_USERS',
            'RowKey': datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f'),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'api_endpoint': 'descendants',
            'account_id': user_details['account_id'],
            'response_count': len(descendants.get('descendants', [])),
            'raw_response': json.dumps(descendants)
        }
        api_calls_table.create_entity(api_call_log)
        
        # Process each descendant
        for descendant in descendants.get('descendants', []):
            account_name = descendant.get('name', '')
            nif = extract_nif_from_account_name(account_name)
            
            if not nif:
                continue
            
            # Track that this user was found in API response
            found_user_nifs.add(nif)
                
            try:
                # Try to get existing user
                existing_user = None
                try:
                    existing_user = users_table.get_entity(partition_key='USER', row_key=nif)
                except:
                    pass  # User doesn't exist yet
                
                # Prepare new user data (without plan)
                new_user_data = {
                    'PartitionKey': 'USER',
                    'RowKey': nif,
                    'nif': nif,
                    'account_id': descendant.get('account_id'),
                    'email': descendant.get('email'),
                    'account_name': account_name,
                    'devices': json.dumps(descendant.get('devices', [])),
                    'status': 'active',  # New status field - active by default
                    'last_updated': datetime.now(timezone.utc).isoformat()
                }
                
                changes = []
                
                if existing_user:
                    # Compare fields and track changes (preserve plan)
                    new_user_data['plan'] = existing_user.get('plan', '')  # Preserve existing plan
                    new_user_data['created_timestamp'] = existing_user.get('created_timestamp')
                    
                    # Check for changes
                    if existing_user.get('account_id') != new_user_data['account_id']:
                        changes.append(f"account_id: '{existing_user.get('account_id')}' → '{new_user_data['account_id']}'")
                    
                    if existing_user.get('email') != new_user_data['email']:
                        changes.append(f"email: '{existing_user.get('email')}' → '{new_user_data['email']}'")
                    
                    if existing_user.get('account_name') != new_user_data['account_name']:
                        changes.append(f"account_name: '{existing_user.get('account_name')}' → '{new_user_data['account_name']}'")
                    
                    if existing_user.get('devices') != new_user_data['devices']:
                        old_devices = json.loads(existing_user.get('devices', '[]'))
                        new_devices = json.loads(new_user_data['devices'])
                        changes.append(f"devices: {len(old_devices)} → {len(new_devices)} dispositivos")
                    
                    # Check for status changes
                    old_status = existing_user.get('status', 'active')
                    if old_status != 'active':
                        # User was inactive/deleted but is now back in API - reactivate
                        changes.append(f"status: '{old_status}' → 'active' (reativado)")
                    
                else:
                    # New user
                    new_user_data['plan'] = ''  # Empty plan for new users
                    new_user_data['created_timestamp'] = datetime.now(timezone.utc).isoformat()
                    changes.append("Novo utilizador criado")
                    changes.append("status: '' → 'active'")
                
                # Update user
                users_table.upsert_entity(new_user_data)
                
                # Create/update UserDevice entities for each device
                from shared.data_processing import create_user_device_entities
                device_data = descendant.get('devices', [])
                user_device_entities = create_user_device_entities(nif, device_data)
                
                user_devices_table = get_table_client('UserDevices')
                for device_entity in user_device_entities:
                    user_devices_table.upsert_entity(device_entity)
                
                logging.info(f"Created/updated {len(user_device_entities)} UserDevice entities for user {nif}")
                
                # Log changes if any
                if changes:
                    change_log = {
                        'PartitionKey': f'USER_{nif}',
                        'RowKey': datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f'),
                        'nif': nif,
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'SYNC_USERS',
                        'changes': json.dumps(changes),
                        'changes_count': len(changes)
                    }
                    user_changes_table.create_entity(change_log)
                
                processed_users.append({
                    'nif': nif,
                    'plan': new_user_data['plan'],
                    'devices': len(descendant.get('devices', [])),
                    'changes': len(changes),
                    'status': 'updated' if existing_user else 'created'
                })
                
                logging.info(f"Processed user {nif} - {len(changes)} changes")
                
            except Exception as e:
                logging.error(f"Error processing user {nif}: {str(e)}")
                processed_users.append({
                    'nif': nif,
                    'status': 'error',
                    'error': str(e)
                })
        
        # Process users that were not found in API response (removed/deactivated)
        inactive_users = []
        for nif, existing_user in existing_users.items():
            if nif not in found_user_nifs and existing_user.get('status', 'active') == 'active':
                try:
                    # Mark user as inactive
                    existing_user['status'] = 'inactive'
                    existing_user['last_updated'] = datetime.now(timezone.utc).isoformat()
                    existing_user['deactivated_timestamp'] = datetime.now(timezone.utc).isoformat()
                    
                    # Update user
                    users_table.update_entity(mode='replace', entity=existing_user)
                    
                    # Log the change
                    change_log = {
                        'PartitionKey': f'USER_{nif}',
                        'RowKey': datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f'),
                        'nif': nif,
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'SYNC_USERS_DEACTIVATION',
                        'changes': json.dumps(["status: 'active' → 'inactive' (utilizador não encontrado na API)"]),
                        'changes_count': 1
                    }
                    user_changes_table.create_entity(change_log)
                    
                    inactive_users.append({
                        'nif': nif,
                        'plan': existing_user.get('plan', ''),
                        'status': 'deactivated',
                        'reason': 'not_found_in_api'
                    })
                    
                    logging.info(f"Deactivated user {nif} - not found in API response")
                    
                except Exception as e:
                    logging.error(f"Error deactivating user {nif}: {str(e)}")
                    inactive_users.append({
                        'nif': nif,
                        'status': 'error_deactivating',
                        'error': str(e)
                    })
        
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "processed_users": len(processed_users),
                "deactivated_users": len(inactive_users),
                "users": processed_users,
                "inactive_users": inactive_users,
                "summary": {
                    "total_processed": len(processed_users),
                    "new_users": len([u for u in processed_users if u.get('status') == 'created']),
                    "updated_users": len([u for u in processed_users if u.get('status') == 'updated']),
                    "deactivated_users": len(inactive_users),
                    "errors": len([u for u in processed_users if u.get('status') == 'error'])
                }
            }),
            status_code=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        logging.error(f"Error in SyncUsers: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status_code=500,
            mimetype="application/json"
        )
