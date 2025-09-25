import { log } from '@temporalio/activity';
import { TrafficMessage } from './traffic-message-resolver';

export async function sendNotificationViaEmail(message: TrafficMessage): Promise<boolean> {
  // Placeholder for email sending logic as Twilio setup is incomplete
  log.info('Sending email notification with message:', { message });
  return true;
}
