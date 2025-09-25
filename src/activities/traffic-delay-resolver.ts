import { log, ApplicationFailure } from '@temporalio/activity';
import { TrafficDetailsResponse } from './traffic-details';

export interface TrafficDelayResolution {
  delay_exceeds_threshold: boolean;
  delay_minutes: number;
  details: TrafficDetailsResponse;
}

export async function resolveTrafficDelay(
  trafficDetails: TrafficDetailsResponse,
  thresholdMinutes: number = 30,
): Promise<TrafficDelayResolution> {
  const activityStartTime = Date.now();

  // Validate inputs
  if (trafficDetails == null) {
    throw ApplicationFailure.create({
      message: 'Traffic details are required',
      nonRetryable: true,
    });
  }

  if (thresholdMinutes < 0) {
    throw ApplicationFailure.create({
      message: 'Threshold minutes must be non-negative',
      nonRetryable: true,
    });
  }

  if (
    trafficDetails.duration == null ||
    typeof trafficDetails.duration.with_traffic !== 'number' ||
    typeof trafficDetails.duration.without_traffic !== 'number'
  ) {
    throw ApplicationFailure.create({
      message: 'Invalid duration data in traffic details',
      nonRetryable: true,
    });
  }

  log.info('Starting traffic delay resolution analysis', {
    threshold_minutes: thresholdMinutes,
    route: {
      origin: trafficDetails.route.origin,
      destination: trafficDetails.route.destination,
    },
  });

  // Calculate delay metrics
  const delayInOriginalUnit = trafficDetails.duration.with_traffic - trafficDetails.duration.without_traffic;
  const unit = trafficDetails.duration.unit ?? 'seconds';

  // Convert delay to minutes based on the unit
  let delayMinutes: number;
  switch (unit) {
    case 'hours':
      delayMinutes = Math.round(delayInOriginalUnit * 60);
      break;
    case 'minutes':
      delayMinutes = Math.round(delayInOriginalUnit);
      break;
    case 'seconds':
    default:
      delayMinutes = Math.round(delayInOriginalUnit / 60);
      break;
  }

  // Prevent division by zero
  const trafficImpactPercent =
    trafficDetails.duration.without_traffic > 0
      ? Math.round((delayInOriginalUnit / trafficDetails.duration.without_traffic) * 100)
      : 0;

  // Check if delay exceeds threshold
  const delayExceedsThreshold = delayMinutes > thresholdMinutes;

  log.info('Traffic delay analysis completed', {
    delayInOriginalUnit,
    unit,
    delayMinutes,
    thresholdMinutes,
    delayExceedsThreshold,
    trafficImpactPercent,
  });

  // Build simple response
  const response: TrafficDelayResolution = {
    delay_exceeds_threshold: delayExceedsThreshold,
    delay_minutes: delayMinutes,
    details: trafficDetails,
  };

  const totalDuration = Date.now() - activityStartTime;

  log.info('Traffic delay resolution completed', {
    totalDuration,
    delayExceedsThreshold,
    delayMinutes,
    thresholdMinutes,
  });

  return response;
}
