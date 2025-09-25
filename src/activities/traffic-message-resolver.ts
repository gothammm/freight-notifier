import { ApplicationFailure } from '@temporalio/client';
import { getOpenAIClient } from '../openai-client';
import { TrafficDelayResolution } from './traffic-delay-resolver';
import { log } from '@temporalio/activity';
import { type OpenAI } from 'openai';

export interface TrafficMessage {
  subject: string;
  message: string;
}

export async function generateTrafficMessage(delayResolution: TrafficDelayResolution): Promise<TrafficMessage> {
  const { delay_minutes, details } = delayResolution;

  let openai: OpenAI;
  try {
    openai = getOpenAIClient();
  } catch (error) {
    log.error('Failed to initialize OpenAI client', { error });
    throw ApplicationFailure.create({
      message: `Failed to initialize OpenAI client: ${error instanceof Error ? error.message : 'Unknown error'}`,
      nonRetryable: true,
    });
  }

  const prompt = `
  Generate a friendly customer notification about a traffic delay for a delivery.
  
  ---- TRAFFIC DELAY DETAILS ----
  Origin: ${details.route.origin}
  Destination: ${details.route.destination}
  Delay Minutes: ${delay_minutes}
  Estimated Arrival Time: ${details.route.estimated_arrival_time}
  Distance: ${details.distance} meters
  Duration with Traffic: ${details.duration.with_traffic} ${details.duration.unit}
  Duration without Traffic: ${details.duration.without_traffic} ${details.duration.unit}
  
  ---- MESSAGE REQUIREMENTS ----
- Return a JSON object with the following fields: subject, message.
- Subject should be concise and informative.
- Message should be professional but empathetic, acknowledging the inconvenience and providing reassurance.

--- OTHER INSTRUCTIONS ---
Keep it professional but empathetic.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'traffic_message',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Brief email subject line about the traffic delay',
            },
            message: {
              type: 'string',
              description: 'Professional but empathetic message to customer',
            },
          },
          required: ['subject', 'message'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  console.log(content);
  if (content) {
    try {
      return JSON.parse(content) as TrafficMessage;
    } catch {
      throw ApplicationFailure.create({ message: 'Failed to parse structured output from OpenAI', nonRetryable: true });
    }
  }

  throw ApplicationFailure.create({ message: 'No content received from OpenAI', nonRetryable: true });
}
