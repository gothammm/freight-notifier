import { Connection, Client } from '@temporalio/client';
import { trafficNotifierWorkflow } from './workflows';
import { nanoid } from 'nanoid';

async function run() {
  // args: [workflow_name: string]
  const workflowName = 'trafficNotifierWorkflow';

  const connection = await Connection.connect({ address: 'localhost:7233' });

  const client = new Client({
    connection,
  });

  const handle = await client.workflow.start(trafficNotifierWorkflow, {
    taskQueue: 'freight-notifier',
    /**
     * Change the arguments here to test different origins and destinations.
     */
    args: [
      {
        origin: {
          lat: 40.7128,
          lng: -74.006,
          address: 'New York, NY',
        },
        destination: {
          lat: 25.7617,
          lng: -80.1918,
          address: 'Miami, FL',
        },
      },
    ],
    workflowId: `workflow-${workflowName}-${nanoid()}`,
  });
  console.log(`Started workflow ${handle.workflowId}`);

  // optional: wait for client result
  console.log(await handle.result());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
