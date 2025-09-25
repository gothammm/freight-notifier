# Traffic Notifier Activities

This directory contains the Temporal activities for the freight traffic notifier system. These activities handle traffic data collection, delay analysis, message generation, and notification delivery.

## Overview

The activities are designed to work together in a workflow to monitor freight routes and notify customers about significant traffic delays. The system uses Mapbox APIs for traffic data and OpenAI for generating customer-friendly notifications.

## Activities

### 1. `getTrafficData`

**File:** `traffic-details.ts`

Fetches real-time traffic information from the Mapbox Directions API.

**Features:**

- Parallel API calls to get both traffic-aware and traffic-free route durations
- Comprehensive error handling and logging
- Support for custom departure times
- Returns detailed route information including distances and timing

**Input:** `TrafficDetailsRequest`

```typescript
{
  departure_time?: string; // ISO string, defaults to now
  origin: { lat: number; lng: number; address?: string };
  destination: { lat: number; lng: number; address?: string };
}
```

**Output:** `TrafficDetailsResponse`

```typescript
{
  duration: {
    with_traffic: number; // default is `seconds` from MapboxAPI
    without_traffic: number; // default is `seconds` from MapboxAPI
    unit: 'seconds' | 'minutes' | 'hours'; // For flexibility reasons.
  }
  distance: number;
  route: {
    origin: string; // Ex: "Miami, FL, USA"
    destination: string; // Ex: "New York, USA"
    departure_time: string; // ISO String
    estimated_arrival_time: string; // ISO String
  }
}
```

**Environment Requirements:**

- `MAPBOX_ACCESS_TOKEN` - Required for API access

### 2. `resolveTrafficDelay`

**File:** `traffic-delay-resolver.ts`

Analyzes traffic data to determine if delays exceed configured thresholds.

**How Delay is Calculated:**

- Takes the difference between `with_traffic` and `without_traffic` durations
- Converts the delay to minutes based on the duration unit (seconds/minutes/hours)
- Compares the delay in minutes against the configured threshold
- Also calculates traffic impact as a percentage of the baseline (no-traffic) duration

**Features:**

- Configurable delay threshold (default: 30 minutes)
- Unit conversion handling (seconds, minutes, hours)
- Traffic impact percentage calculation
- Input validation and error handling

**Input:**

- `trafficDetails: TrafficDetailsResponse`
- `thresholdMinutes: number` (optional, defaults to 30)

**Output:** `TrafficDelayResolution`

```typescript
{
  delay_exceeds_threshold: boolean;
  delay_minutes: number;
  details: TrafficDetailsResponse;
}
```

### 3. `generateTrafficMessage`

**File:** `traffic-message-resolver.ts`

Uses OpenAI to generate customer-friendly traffic delay notifications.

**Features:**

- AI-generated personalized messages
- Structured JSON output with subject and message
- Professional but empathetic tone
- Detailed route and timing information included in prompts

**Input:** `TrafficDelayResolution`

**Output:** `TrafficMessage`

```typescript
{
  subject: string; // Email subject line
  message: string; // Customer notification message
}
```

**Dependencies:**

- OpenAI API client (configured via `../openai-client.ts`)

### 4. `sendNotificationViaEmail`

**File:** `traffic-notifier-transport.ts`

Handles the delivery of traffic notifications via email.

**Features:**

- Currently a placeholder implementation
- Logs notification details
- Returns success status

**Input:** `TrafficMessage`
**Output:** `boolean` (success status)

**Note:** This is currently a stub implementation that only logs the message and returns `true`. The full email implementation is incomplete due to Twilio account setup issues.

## Usage in Workflows

These activities are typically used together in the following sequence:

1. **Get Traffic Data** - Fetch current traffic conditions
2. **Resolve Delay** - Analyze if delays are significant
3. **Generate Message** - Create customer notification (if there is a delay)
4. **Send Notification** - Deliver the message to customers (if there is a delay)

## Configuration

### Environment Variables

- `MAPBOX_ACCESS_TOKEN` - Required for traffic data collection
- OpenAI API configuration (handled by `openai-client.ts`)

### Default Values

- Traffic delay threshold: 30 minutes
- Time units: seconds (for Mapbox API responses)
- Message model: `gpt-4o-mini`

## Error Handling

All activities implement comprehensive error handling:

- **ApplicationFailure** for business logic errors
- **Input validation** with detailed error messages
- **API error handling** with retry/non-retry classification
- **Structured logging** for debugging and monitoring

## Logging

Activities use Temporal's structured logging:

- Activity start/completion metrics
- API call timing and status
- Route and delay calculations
- Error details and context

## Development Notes

- All activities are exported through `index.ts`
- TypeScript interfaces are co-located with implementations
- Activities follow Temporal best practices for reliability
- Comprehensive input validation prevents runtime errors
- Logging includes performance metrics for monitoring
