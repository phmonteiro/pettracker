import requests
import json
import os
import logging
from datetime import datetime, timezone

class TrackimoAPI:
    def __init__(self):
        self.username = os.environ.get('TRACKIMO_USERNAME')
        self.password = os.environ.get('TRACKIMO_PASSWORD')
        self.server_url = os.environ.get('TRACKIMO_SERVER_URL')
        self.client_id = os.environ.get('TRACKIMO_CLIENT_ID')
        self.client_secret = os.environ.get('TRACKIMO_CLIENT_SECRET')
        self.redirect_uri = os.environ.get('TRACKIMO_REDIRECT_URI')
        
        if not all([self.username, self.password, self.server_url, self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("Missing required Trackimo configuration")

    def do_login_and_get_access_token(self):
        """Login and get access token"""
        try:
            # Login
            resp = requests.post(f'{self.server_url}/api/internal/v2/user/login',
                               headers={'Content-Type': 'application/json'},
                               json={"username": self.username, 
                                   "password": self.password, 
                                   "whitelabel": "FIDELIDADE"})
            
            if resp.status_code != 200:
                logging.error(f"Login failed: Status Code {resp.status_code}, Response: {resp.text}")
                return None
            
            cookies = dict(resp.cookies)

            # OAuth authorization
            resp = requests.get(f'{self.server_url}/api/v3/oauth2/auth',
                              params={'client_id': self.client_id,
                                    'redirect_uri': self.redirect_uri,
                                    'response_type': 'code',
                                    'scope': 'locations,notifications,devices,accounts,settings,geozones'},
                              cookies=cookies,
                              allow_redirects=False)
            
            if resp.status_code != 302:
                logging.error(f"OAuth auth failed: Status Code {resp.status_code}")
                return None
                
            location = resp.headers.get('Location')
            if not location or '=' not in location:
                logging.error(f"Invalid redirect location: {location}")
                return None
                
            code = location.split('=')[1]

            # Get token
            resp = requests.post(f'{self.server_url}/api/v3/oauth2/token',
                               headers={'Content-Type': 'application/json'},
                               json={'client_id': self.client_id,
                                   'client_secret': self.client_secret,
                                   'code': code},
                               cookies=cookies)
            
            if resp.status_code != 200:
                logging.error(f"Token request failed: Status Code {resp.status_code}")
                return None
            
            return resp.json().get('access_token')
            
        except Exception as e:
            logging.error(f"Error in login: {str(e)}")
            return None

    def get_user_details(self, access_token):
        """Get user details"""
        try:
            resp = requests.get(f'{self.server_url}/api/v3/user', 
                              headers={'Authorization': f'Bearer {access_token}'})
            if resp.status_code == 200:
                return resp.json()
            else:
                logging.error(f"Get user details failed: {resp.status_code}")
                return None
        except Exception as e:
            logging.error(f"Error getting user details: {str(e)}")
            return None

    def get_descendants(self, access_token, account_id):
        """Get account descendants"""
        try:
            resp = requests.get(f'{self.server_url}/api/v4/accounts/{account_id}/descendants',
                              headers={'Authorization': f'Bearer {access_token}'})
            if resp.status_code == 200:
                return resp.json()
            else:
                logging.error(f"Get descendants failed: {resp.status_code}")
                return None
        except Exception as e:
            logging.error(f"Error getting descendants: {str(e)}")
            return None

    def get_events(self, access_token, account_id, from_timestamp, to_timestamp):
        """Get events for an account within date range"""
        try:
            event_types = 'GEOZONE_ENTRY,GEOZONE_EXIT'
            resp = requests.get(f'{self.server_url}/api/v3/accounts/{account_id}/events_with_date_range',
                              headers={'Authorization': f'Bearer {access_token}'},
                              params={
                                  'alarm_types': event_types,
                                  'from': from_timestamp,
                                  'to': to_timestamp,
                                  'sort_direction': 'asc',
                                  'page': 1,
                                  'limit': 1000
                              })
            if resp.status_code == 200:
                events = resp.json()
                # Add timestamp for when we retrieved this data
                for event in events:
                    event["retrieved_timestamp"] = datetime.now(timezone.utc).isoformat()
                return events
            else:
                logging.error(f"Get events failed: {resp.status_code}")
                return None
        except Exception as e:
            logging.error(f"Error getting events: {str(e)}")
            return None

    def get_time_stamp_in_utc(self, year, month, day, hour, minute, second):
        """Convert datetime to UTC timestamp"""
        dt = datetime(year, month, day, hour, minute, second, 0, timezone.utc)
        return int(dt.timestamp())
