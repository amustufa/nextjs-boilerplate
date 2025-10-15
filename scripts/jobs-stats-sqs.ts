#!/usr/bin/env tsx
export {};

/* Prints SQS queue attributes */

function requireSQS(): {
  SQSClient: new (opts: { region: string }) => { send<T = unknown>(cmd: unknown): Promise<T> };
  GetQueueAttributesCommand: new (input: { QueueUrl: string; AttributeNames: string[] }) => unknown;
} {
  try {
    return require('@aws-sdk/client-sqs') as unknown as {
      SQSClient: new (opts: { region: string }) => { send<T = unknown>(cmd: unknown): Promise<T> };
      GetQueueAttributesCommand: new (input: {
        QueueUrl: string;
        AttributeNames: string[];
      }) => unknown;
    };
  } catch (e) {
    const err = e as Error;
    throw new Error(`@aws-sdk/client-sqs not installed. Original: ${err.message}`);
  }
}

async function main() {
  const url = process.env.SQS_QUEUE_URL;
  const region = process.env.AWS_REGION ?? 'us-east-1';
  if (!url) {
    console.error('SQS_QUEUE_URL is required');
    process.exit(1);
  }
  const { SQSClient, GetQueueAttributesCommand } = requireSQS();
  const client = new SQSClient({ region });
  const attrs = [
    'ApproximateNumberOfMessages',
    'ApproximateNumberOfMessagesNotVisible',
    'ApproximateNumberOfMessagesDelayed',
    'CreatedTimestamp',
    'LastModifiedTimestamp',
    'VisibilityTimeout',
    'ReceiveMessageWaitTimeSeconds',
  ];
  const res = (await client.send<{ Attributes?: Record<string, string> }>(
    new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: attrs }),
  )) as { Attributes?: Record<string, string> };
  console.log(JSON.stringify(res.Attributes ?? {}, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
