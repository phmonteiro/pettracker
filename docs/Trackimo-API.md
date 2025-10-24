# Trackimo Server API Documentation

**Version:** 1.0  
**Base URL:** Your Trackimo API server URL

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
  - [User & Account Management](#user--account-management)
  - [Device Management](#device-management)
  - [Location & Tracking](#location--tracking)
  - [Events & Alarms](#events--alarms)
  - [Geozones & Safezones](#geozones--safezones)
  - [Firmware Updates (FOTA)](#firmware-updates-fota)
  - [Subscription & Plans](#subscription--plans)
  - [Contacts](#contacts)
- [Error Handling](#error-handling)

---

## Overview

The Trackimo Server API provides comprehensive access to GPS tracking device management, location history, geofencing, and event monitoring. This API follows REST principles and uses JSON for request/response payloads.

**Key Features:**
- Real-time device location tracking
- Geofencing with entry/exit alerts
- Event history and notifications
- Firmware over-the-air (FOTA) updates
- Multi-account hierarchy support
- OAuth 2.0 authentication

---

## Authentication

### OAuth 2.0 Flow

The Trackimo API uses OAuth 2.0 for authentication. All authenticated endpoints require an `Authorization` header:

```
Authorization: Bearer {access_token}
```

### Login Endpoint

**POST** `/api/v3/user/login`

Request body:
```json
{
  "username": "your_email@example.com",
  "password": "your_password",
  "client_id": "your_client_id",
  "remember_me": false
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "Bearer",
  "expires_in": "3600",
  "refresh_token": "refresh_token_here"
}
```

---

## Core Endpoints

### User & Account Management

#### Get User Profile

**GET** `/api/v3/user`

Returns the authenticated user's profile information.

**Headers:**
- `Authorization: Bearer {access_token}`

**Response:**
```json
{
  "email": "user@example.com",
  "username": "user@example.com",
  "user_id": 12345,
  "account_id": 67890,
  "accountRole": "OWNER",
  "userActivationStatus": "ACTIVE"
}
```

---

#### Get Account Details

**GET** `/api/v3/accounts/{account_id}`

**Parameters:**
- `account_id` (path, required): Account ID
- `fetch_account_features` (query, optional): Include feature flags (default: false)
- `fetch_fast_tracking_status` (query, optional): Include fast tracking status (default: false)

**Response:**
```json
{
  "id": 67890,
  "name": "Pet Tracker Account",
  "email": "user@example.com",
  "phone": "+1234567890",
  "preferences": {
    "language": "en",
    "speed_unit": "mph",
    "time_format": "US",
    "email_notifications": true,
    "push_notifications": true
  }
}
```

---

#### List All Accounts

**GET** `/api/v3/accounts`

Returns all accounts associated with the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Max records per page (default: 20)
- `parent_id` (optional): Filter by parent account ID

---

### Device Management

#### Get Account Devices with Details

**GET** `/api/v2/accounts/{account_id}/devices/details`

Returns comprehensive device information including location, status, and plans.

**Query Parameters:**
- `fetch_last_location_object` (optional): Include last location (default: false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Max records per page (default: 20)

**Response:**
```json
{
  "account_id": 67890,
  "name": "Pet Tracker Account",
  "devices": [
    {
      "device_id": 123456,
      "device_name": "Max's Collar",
      "type": "Guardian",
      "status": "active",
      "battery": 85,
      "last_location": {
        "lat": 37.7749,
        "lng": -122.4194,
        "time": 1698765432000,
        "type": "GPS",
        "speed": 0,
        "battery": 85
      },
      "current_device_plan": {
        "id": 789,
        "expiration_date": "2024-12-31T23:59:59Z"
      }
    }
  ]
}
```

---

#### Get Device Details (Full)

**GET** `/api/v3/accounts/{account_id}/devices/{device_id}/details/full`

Returns complete device information including all features and configuration.

---

#### Update Device

**PUT** `/api/v3/accounts/{account_id}/devices/{device_id}`

Update device name, icon, or other properties.

**Request Body:**
```json
{
  "name": "New Device Name",
  "icon_id": 5
}
```

---

### Location & Tracking

#### Get Device Location History

**GET** `/api/v3/accounts/{account_id}/devices/{device_id}/history`

Returns location history for a device within a specified time range.

**Query Parameters:**
- `from` (optional): Start timestamp (epoch milliseconds)
- `to` (optional): End timestamp (epoch milliseconds)
- `types` (optional): Location types (GPS=1, GSM=2, WIFI=3, BT=4)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Max records (default: 20)
- `kalman_filter` (optional): Apply smoothing filter (default: false)
- `osrm_routing` (optional): Use AI route optimization (default: false)

**Response:**
```json
[
  {
    "location_id": 9876543210,
    "device_id": 123456,
    "lat": 37.7749,
    "lng": -122.4194,
    "time": 1698765432000,
    "type": "GPS",
    "speed": 5,
    "battery": 85,
    "altitude": 50,
    "accuracy_in_meter": 10.5,
    "gps": true,
    "is_triangulated": false
  }
]
```

---

#### Get Device Location History with Events

**GET** `/api/v1/accounts/{account_id}/devices/{device_id}/location_event/history/details`

Returns both location points and events in chronological order.

**Query Parameters:**
- Same as location history endpoint
- `RSF_enabled` (optional): Include special location filtering (default: false)

---

#### Request Device Location Update

**POST** `/api/v3/accounts/{account_id}/devices/{device_id}/locations`

Sends a command to the device to report its current location.

**Response:**
```json
{
  "request_id": "abc123def456",
  "status": "pending"
}
```

---

### Events & Alarms

#### Get Account Events

**GET** `/api/v3/accounts/{account_id}/events_with_date_range`

Returns all events for devices in an account.

**Query Parameters:**
- `from` (optional): Start timestamp (epoch milliseconds)
- `to` (optional): End timestamp (epoch milliseconds)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Max records (default: 20)
- `device_ids` (optional): Filter by device IDs (comma-separated)
- `alarm_types` (optional): Filter by alarm types
- `sort_direction` (optional): "asc" or "desc"

**Alarm Types:**
- `GEOZONE_ALARM_EVENT` - Geofence violation
- `SOS_BUTTON_ALARM_EVENT` - SOS button pressed
- `BATTERY_ALARM_EVENT` - Low battery
- `SPEED_ALARM_EVENT` - Speed limit exceeded
- `START_MOVING_ALARM_EVENT` - Device started moving
- `STOP_MOVING_ALARM_EVENT` - Device stopped moving
- `WIFI_SAFEZONE_ALARM_EVENT` - WiFi safezone entry/exit
- `CHARGING_START_EVENT` - Charging started
- `CHARGING_STOP_EVENT` - Charging stopped
- `TEMPERATURE_EVENT` - Temperature alert
- `TAMPERING_EVENT` - Device tampering detected

**Response:**
```json
[
  {
    "id": 123456789,
    "device_id": 123456,
    "device_name": "Max's Collar",
    "alarm_type": "GEOZONE_ALARM_EVENT",
    "message": "Device exited Home Zone",
    "priority": "HIGH",
    "lat": 37.7749,
    "lng": -122.4194,
    "created": "2024-10-31T12:30:00Z",
    "read": false,
    "archived": false,
    "geozone_name": "Home Zone"
  }
]
```

---

#### Get Unread Event Count

**GET** `/api/v3/accounts/{account_id}/events/search/count`

Returns count of unread/read events by alarm type.

**Query Parameters:**
- `read_status` (optional): "read" or "unread" (default: "unread")
- `alarm_types` (optional): Filter by alarm types

---

#### Update Event Status

**PUT** `/api/v3/accounts/{account_id}/events/{event_id}`

Mark events as read, archived, or change priority.

**Request Body:**
```json
{
  "read": true,
  "archived": false,
  "priority": "LOW"
}
```

---

#### Delete Events

**DELETE** `/api/v3/accounts/{account_id}/events/delete-by-ids`

Delete specific events by their IDs.

**Query Parameters:**
- `eventIds` (required): Comma-separated list of event IDs

---

### Geozones & Safezones

#### List Geozones

**GET** `/api/v3/accounts/{account_id}/geozones`

Returns all geofences configured for an account.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Max records (default: 20)

**Response:**
```json
[
  {
    "id": 456,
    "name": "Home Zone",
    "type": "CIRCLE",
    "preferences": {
      "lat1": 37.7749,
      "long1": -122.4194,
      "radius": 100,
      "direction": "BOTH"
    },
    "deviceIds": [123456, 789012]
  }
]
```

---

#### Create Geozone

**POST** `/api/v3/accounts/{account_id}/geozones`

Create a new geofence.

**Request Body:**
```json
{
  "name": "Office Zone",
  "type": "CIRCLE",
  "preferences": {
    "lat1": 37.7749,
    "long1": -122.4194,
    "radius": 200,
    "direction": "BOTH"
  },
  "deviceIds": [123456]
}
```

**Geozone Types:**
- `CIRCLE` - Circular geofence (requires center point + radius)
- `POLYGON` - Multi-point polygon geofence
- `RECTANGLE` - Rectangular geofence

**Direction Options:**
- `IN` - Alert on entry only
- `OUT` - Alert on exit only
- `BOTH` - Alert on both entry and exit

---

#### Update Geozone

**PUT** `/api/v3/accounts/{account_id}/geozones/{geozone_id}`

Update an existing geofence.

---

#### Delete Geozone

**DELETE** `/api/v3/accounts/{account_id}/geozones/{geozone_id}`

Remove a geofence.

---

#### Get Devices Assigned to Geozone

**GET** `/api/v3/accounts/{account_id}/geozones/{geozone_id}/devices`

List all devices currently assigned to a specific geofence.

---

#### WiFi Safezones

WiFi safezones detect when a device connects to a known WiFi network.

**POST** `/api/v3/accounts/{account_id}/safezones`

Create a WiFi safezone:

```json
{
  "name": "Home WiFi",
  "wifi_name": "MyHomeNetwork",
  "address": "123 Main St",
  "alarm_direction": "OUT",
  "disable_gsm": false
}
```

---

### Firmware Updates (FOTA)

#### Check FOTA Status

**GET** `/api/v3/firmware/accounts/{account_id}/devices/{device_id}/logs`

Check firmware update status for a device.

**Query Parameters:**
- `include_cellular_data` (optional): Include cellular update info (default: false)

**Response:**
```json
{
  "device_id": 123456,
  "fota_status": "SUCCESS",
  "progress": 100,
  "updated": 1698765432000,
  "is_cellular": false
}
```

**FOTA Status Values:**
- `IN_PROGRESS` - Update is downloading/installing
- `SUCCESS` - Update completed successfully
- `FAILED` - Update failed
- `FAIL_REQUIRE_MANUAL_REBOOT` - Requires manual device reboot

---

#### Initiate FOTA Update

**POST** `/api/v3/firmware/accounts/{account_id}/devices/fota`

Start a firmware update for one or more devices.

**Request Body:**
```json
{
  "device_ids": [123456, 789012],
  "firmware_group_id": 5
}
```

---

#### Get Firmware Change Details

**GET** `/api/v3/firmware/accounts/{account_id}/devices/{device_id}/fw_changes`

Returns information about what's new in available firmware update.

---

### Subscription & Plans

#### Get Device Plans

**GET** `/api/v3/accounts/{account_id}/devices/{device_id}/plans`

Returns all available subscription plans for a device.

**Response:**
```json
[
  {
    "id": 101,
    "name": "Premium Monthly",
    "amount": "9.99",
    "currency": "USD",
    "months": 1,
    "paymentCycle": "MONTH",
    "maxSmsPerMonth": 100,
    "trackingInterval": 60
  }
]
```

---

#### Get Active Device Subscriptions

**GET** `/api/v3/accounts/{account_id}/devices/{device_id}/subscriptions`

Returns current active subscription details.

---

#### Change Device Plan

**POST** `/api/v3/devices/{device_id}/plans/change`

Update device subscription plan.

---

#### Get SMS Plans by Country

**GET** `/api/v3/country/{country_code}/smsoptions`

Returns available SMS plan options for a specific country.

**Parameters:**
- `country_code` (path, required): Numeric country code

---

### Contacts

#### List Contacts

**GET** `/api/v3/accounts/{account_id}/contacts`

Returns all emergency contacts configured for an account.

**Response:**
```json
[
  {
    "id": 789,
    "name": "John Doe",
    "address": "john@example.com",
    "type": "EMAIL",
    "notificationType": "EMAIL"
  }
]
```

**Contact Types:**
- `EMAIL` - Email address
- `PHONE` - Phone number (SMS)
- `URL` - Webhook URL

---

#### Create Contact

**POST** `/api/v3/accounts/{account_id}/contacts`

Add a new emergency contact.

**Request Body:**
```json
{
  "name": "Emergency Contact",
  "address": "emergency@example.com",
  "type": "EMAIL"
}
```

---

#### Update Contact

**PUT** `/api/v3/accounts/{account_id}/contacts/{contact_id}`

Update contact details.

---

#### Delete Contact

**DELETE** `/api/v3/accounts/{account_id}/contacts/{contact_id}`

Remove a contact.

---

## Error Handling

### Standard Error Response

All errors return a consistent structure:

```json
{
  "code": "DEVICE_NOT_FOUND",
  "message": "Device with ID 123456 not found",
  "message_key": "error.device.not_found",
  "errors": [
    {
      "message": "Device ID is invalid",
      "property_name": "device_id",
      "message_key": "validation.invalid_device_id"
    }
  ]
}
```

### Common HTTP Status Codes

- **200 OK** - Request succeeded
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Missing or invalid authentication token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Resource conflict (e.g., duplicate)
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Service temporarily unavailable

### Common Error Codes

- `INVALID_CREDENTIALS` - Login failed
- `TOKEN_EXPIRED` - Access token has expired
- `DEVICE_NOT_FOUND` - Device ID doesn't exist
- `ACCOUNT_NOT_FOUND` - Account ID doesn't exist
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `GEOZONE_LIMIT_REACHED` - Maximum geozones exceeded
- `DEVICE_OFFLINE` - Device hasn't connected recently
- `PLAN_EXPIRED` - Subscription has expired

---

## Additional Resources

### Device Settings

Update device tracking behavior, alerts, and preferences using the settings endpoints:

**PUT** `/api/v3/accounts/{account_id}/devices/{device_id}/settings`

```json
{
  "name": "Updated Settings",
  "preferences": {
    "speed_unit": "mph",
    "show_address": true,
    "email_notifications": true
  }
}
```

### Control Messages

Send commands directly to devices (advanced):

**POST** `/api/v3/control_message/device_queue/add`

Queue a control message for the device to execute on next connection.

---

## Rate Limits

- **Standard requests:** 100 requests per minute per account
- **Location history:** 20 requests per minute
- **Location updates:** 10 requests per minute per device

Exceeding rate limits returns HTTP 429 (Too Many Requests).

---

## Best Practices

1. **Cache access tokens** - Tokens are valid for 1 hour, refresh when needed
2. **Use pagination** - Limit large result sets to avoid timeouts
3. **Filter by date range** - When querying history, always specify time bounds
4. **Handle 503 gracefully** - Implement retry logic with exponential backoff
5. **Validate device status** - Check device is active before requesting location
6. **Use webhooks** - Configure webhooks for real-time event notifications
7. **Monitor FOTA carefully** - Don't initiate updates when battery < 30%

---

**End of Documentation**

*Generated from Trackimo OpenAPI Specification v1.0*
