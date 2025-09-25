# Freight Traffic Notifier

A Temporal-based system that monitors freight routes for traffic delays and automatically generates customer notifications using AI when delays exceed configurable thresholds.

## Features

- Real-time traffic monitoring using Mapbox APIs
- Intelligent delay analysis with configurable thresholds
- AI-generated customer notifications via OpenAI

## Documentation

- [Activities Documentation](./src/activities/README.md) - Detailed documentation of all activities

## Setup

1. Install dependencies: `npm install`
2. Set environment variables:
   - `MAPBOX_ACCESS_TOKEN` - Required for traffic data
   - `OPENAI_API_KEY` - Required for AI-generated notifications

## Running the System

1. Start Temporal Server: `temporal server start-dev`
2. Start the Worker: `npm run start.watch`
3. In another shell, run the workflow with manual arguments: `npm run workflow`

**Note:** The workflow requires manual argument configuration. You can either:

- Modify the workflow execution parameters in the client code to specify origin/destination coordinates and optional departure time
- Use the Temporal Web UI (http://localhost:8233) to start workflows with custom arguments

## Workflow Response

The workflow returns comprehensive traffic analysis including delay calculations, AI-generated messages (if delays exceed threshold), and notification delivery status.

## Known Limitations & Problem-Solving Approach

### Email Notifications (Incomplete Implementation)

- **Issue**: The `sendNotificationViaEmail` activity is currently a stub implementation
- **Specific Problem**: Twilio account setup issues prevented full email integration
- **Approach Tried**: Initially attempted to integrate Twilio SendGrid for email delivery
- **Current Solution**: Implemented logging-based stub that returns success status

### Manual Workflow Configuration

- **Issue**: No automated client interface for workflow execution
- **Approach**: Documented two execution methods (code modification and Web UI)
- **Assumption**: Users can manually configure lat/lng coordinates for testing

### Error Handling Strategy

- **Approach**: Comprehensive error handling with ApplicationFailure classification
- **Assumption**: Mapbox API responses follow documented format
- **Limitation**: Some edge cases in API responses may need additional validation

See [Activities Documentation](./src/activities/README.md) for technical implementation details.
