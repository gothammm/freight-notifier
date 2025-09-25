import { log, ApplicationFailure } from '@temporalio/activity';

export interface TrafficDetailsRequest {
  departure_time?: string; // ISO string, defaults to now
  origin: {
    lat: number;
    lng: number;
    address?: string;
  };
  destination: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface TrafficDetailsResponse {
  duration: {
    with_traffic: number; // in seconds
    without_traffic: number; // in seconds
    unit: 'seconds' | 'minutes' | 'hours';
  };
  distance: number; // in meters
  route: {
    origin: string;
    destination: string;
    departure_time: string; // ISO string
    estimated_arrival_time: string; // ISO string
  };
}

export async function getTrafficData(request: TrafficDetailsRequest): Promise<TrafficDetailsResponse> {
  const activityStartTime = Date.now();

  log.info('Starting getTrafficData activity', {
    origin: {
      coordinates: `${request.origin.lat},${request.origin.lng}`,
      address: request.origin.address || 'No address provided',
    },
    destination: {
      coordinates: `${request.destination.lat},${request.destination.lng}`,
      address: request.destination.address || 'No address provided',
    },
    departureTime: request.departure_time || 'Now (not specified)',
  });

  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    log.error('Mapbox access token is not configured in environment variables');
    throw ApplicationFailure.create({ message: 'MAPBOX_ACCESS_TOKEN is not set', nonRetryable: true });
  }

  log.debug('Mapbox access token found, proceeding with API calls');

  const { origin, destination } = request;

  // Convert lat,lng to lng,lat format for Mapbox API
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';

  log.debug('Prepared Mapbox API request parameters', {
    coordinates,
    baseUrl,
    apiEndpoints: ['driving-traffic', 'driving'],
  });

  const commonParams = new URLSearchParams({
    access_token: accessToken,
    geometries: 'geojson',
    overview: 'simplified',
    alternatives: 'false',
  });

  const apiCallStartTime = Date.now();
  log.info('Making parallel API calls to Mapbox Directions API');

  const [trafficResponse, noTrafficResponse] = await Promise.all([
    fetch(`${baseUrl}/driving-traffic/${coordinates}?${commonParams}`),
    fetch(`${baseUrl}/driving/${coordinates}?${commonParams}`),
  ]);

  const apiCallDuration = Date.now() - apiCallStartTime;
  log.info(`Mapbox API calls completed in ${apiCallDuration}ms`, {
    trafficResponseStatus: trafficResponse.status,
    noTrafficResponseStatus: noTrafficResponse.status,
  });

  if (!trafficResponse.ok) {
    const errorText = await trafficResponse.text();
    log.error('Mapbox driving-traffic API request failed', {
      status: trafficResponse.status,
      statusText: trafficResponse.statusText,
      errorResponse: errorText,
      coordinates,
    });
    throw ApplicationFailure.create({
      message: `Mapbox driving-traffic API error: ${trafficResponse.status} - ${errorText}`,
    });
  }

  if (!noTrafficResponse.ok) {
    const errorText = await noTrafficResponse.text();
    log.error('Mapbox driving API request failed', {
      status: noTrafficResponse.status,
      statusText: noTrafficResponse.statusText,
      errorResponse: errorText,
      coordinates,
    });
    throw ApplicationFailure.create({
      message: `Mapbox driving API error: ${noTrafficResponse.status} - ${errorText}`,
    });
  }

  // Parse responses
  log.debug('Parsing Mapbox API responses');
  const trafficData: any = await trafficResponse.json();
  const noTrafficData: any = await noTrafficResponse.json();

  log.debug('API responses parsed successfully', {
    trafficRoutesFound: trafficData.routes?.length || 0,
    noTrafficRoutesFound: noTrafficData.routes?.length || 0,
  });

  // Extract route data
  const trafficRoute = trafficData.routes?.[0];
  const noTrafficRoute = noTrafficData.routes?.[0];

  if (!trafficRoute || !noTrafficRoute) {
    log.error('No routes found in Mapbox API response', {
      trafficRoutes: trafficData.routes?.length || 0,
      noTrafficRoutes: noTrafficData.routes?.length || 0,
      trafficDataKeys: Object.keys(trafficData),
      noTrafficDataKeys: Object.keys(noTrafficData),
    });
    throw ApplicationFailure.create({
      message: 'No routes found in Mapbox API response',
      nonRetryable: true,
    });
  }

  log.debug('Route data extracted successfully', {
    trafficDuration: trafficRoute.duration,
    noTrafficDuration: noTrafficRoute.duration,
    distance: trafficRoute.distance,
  });

  // Calculate departure and arrival times
  const departureTime = request.departure_time ? new Date(request.departure_time) : new Date();
  const arrivalTime = new Date(departureTime.getTime() + trafficRoute.duration * 1000);

  log.debug('Calculated timing information', {
    departureTime: departureTime.toISOString(),
    estimatedArrivalTime: arrivalTime.toISOString(),
    trafficDelaySeconds: Math.round(trafficRoute.duration - noTrafficRoute.duration),
  });

  const response: TrafficDetailsResponse = {
    duration: {
      with_traffic: Math.round(trafficRoute.duration),
      without_traffic: Math.round(noTrafficRoute.duration),
      unit: 'seconds',
    },
    distance: Math.round(trafficRoute.distance), // Mapbox returns meters
    route: {
      origin: origin.address || `${origin.lat}, ${origin.lng}`,
      destination: destination.address || `${destination.lat}, ${destination.lng}`,
      departure_time: departureTime.toISOString(),
      estimated_arrival_time: arrivalTime.toISOString(),
    },
  };

  const totalActivityDuration = Date.now() - activityStartTime;
  const trafficDelay = response.duration.with_traffic - response.duration.without_traffic;
  const trafficDelayMinutes = Math.round(trafficDelay / 60);

  log.info('Traffic data activity completed successfully', {
    totalDurationMs: totalActivityDuration,
    route: {
      origin: response.route.origin,
      destination: response.route.destination,
      distanceKm: Math.round((response.distance / 1000) * 100) / 100,
    },
    timing: {
      withTrafficMinutes: Math.round(response.duration.with_traffic / 60),
      withoutTrafficMinutes: Math.round(response.duration.without_traffic / 60),
      trafficDelayMinutes,
      trafficImpactPercent: Math.round((trafficDelay / response.duration.without_traffic) * 100),
    },
  });

  return response;
}
