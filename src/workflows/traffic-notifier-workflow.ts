import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from '../activities';

const { getTrafficData, resolveTrafficDelay, generateTrafficMessage, sendNotificationViaEmail } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '10 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 5,
  },
});

export async function trafficNotifierWorkflow(request: activities.TrafficDetailsRequest): Promise<{
  trafficDetails: activities.TrafficDetailsResponse;
  delayResolution: activities.TrafficDelayResolution;
  messageFromAI?: activities.TrafficMessage;
  notificationSent: boolean;
}> {
  const trafficDetails = await getTrafficData(request);
  const delayResolution = await resolveTrafficDelay(trafficDetails, 30);
  let messageFromAI: activities.TrafficMessage | undefined;
  let notificationSent = false;

  if (delayResolution.delay_exceeds_threshold) {
    log.info('Traffic delay exceeds threshold:', {
      ...delayResolution,
      alert: 'Notify relevant stakeholders about the delay',
    });
    messageFromAI = await generateTrafficMessage(delayResolution);

    notificationSent = await sendNotificationViaEmail(messageFromAI);
    log.info('Generated traffic delay message:', { messageFromAI });
  } else {
    log.info('Traffic delay is within acceptable limits:', {
      ...delayResolution,
      alert: 'No action required',
    });
  }
  return {
    trafficDetails,
    delayResolution,
    messageFromAI,
    notificationSent,
  };
}
