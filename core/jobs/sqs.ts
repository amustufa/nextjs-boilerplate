import type { Jobs } from '@/core/services';

type SQSModule = {
  SQSClient: new (opts: { region: string }) => {
    send<T = unknown>(cmd: unknown): Promise<T>;
  };
  SendMessageCommand: new (input: {
    QueueUrl: string;
    MessageBody: string;
    DelaySeconds?: number;
    MessageGroupId?: string;
    MessageDeduplicationId?: string;
  }) => unknown;
  ReceiveMessageCommand: new (input: {
    QueueUrl: string;
    MaxNumberOfMessages?: number;
    WaitTimeSeconds?: number;
    VisibilityTimeout?: number;
    AttributeNames?: string[];
  }) => unknown;
  DeleteMessageCommand: new (input: { QueueUrl: string; ReceiptHandle: string }) => unknown;
  ChangeMessageVisibilityCommand: new (input: {
    QueueUrl: string;
    ReceiptHandle: string;
    VisibilityTimeout: number;
  }) => unknown;
};

type ReceiveMessage = { Body?: string; ReceiptHandle?: string | null };
type ReceiveResponse = { Messages?: ReceiveMessage[] };
type SendResponse = { MessageId?: string };

function loadSQS(): SQSModule {
  try {
    const mod = require('@aws-sdk/client-sqs') as unknown as SQSModule;
    return mod;
  } catch (e) {
    const err = e as Error;
    throw new Error(
      `@aws-sdk/client-sqs not installed. Install it to use SQS. Original: ${err.message}`,
    );
  }
}

let signalsBound = false;

export function createJobsSQS(): Jobs {
  const {
    SQSClient,
    SendMessageCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    ChangeMessageVisibilityCommand,
  } = loadSQS();
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const queueUrl = process.env.SQS_QUEUE_URL;
  if (!queueUrl) {
    throw new Error('SQS_QUEUE_URL is required for JOBS_BACKEND=sqs');
  }
  const qUrl: string = queueUrl;
  const isFifo = queueUrl.endsWith('.fifo') || process.env.SQS_FIFO === 'true';
  const groupId = process.env.SQS_MESSAGE_GROUP_ID ?? 'app-jobs';
  const client = new SQSClient({ region });

  const handlers = new Map<string, (payload: unknown) => Promise<void>>();
  let polling = false;
  let stopping = false;
  const inFlight = new Set<Promise<unknown>>();
  const concurrency = Math.min(isFifo ? 1 : Number(process.env.SQS_CONCURRENCY ?? 5), 10);
  const heartbeatSec = Number(process.env.SQS_HEARTBEAT_SEC ?? 20);
  const extendBySec = Number(process.env.SQS_EXTEND_BY_SEC ?? 30);

  function bindSignals() {
    if (signalsBound) return;
    const onSignal = (sig: string) => {
      console.log(`[jobs:sqs] received ${sig}, stopping poller...`);
      stopping = true;
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    signalsBound = true;
  }

  async function pollLoop(): Promise<void> {
    if (polling) return;
    polling = true;
    bindSignals();
    while (!stopping) {
      try {
        const resp = (await client.send<ReceiveResponse>(
          new ReceiveMessageCommand({
            QueueUrl: qUrl,
            MaxNumberOfMessages: Math.min(concurrency, 10),
            WaitTimeSeconds: 20,
            VisibilityTimeout: 30,
            AttributeNames: ['MessageGroupId'],
          }),
        )) as ReceiveResponse;
        const messages: ReceiveMessage[] = resp.Messages ?? [];
        const processOne = async (m: ReceiveMessage) => {
          const stopHeartbeat = startHeartbeat(m.ReceiptHandle ?? undefined);
          try {
            const body: unknown = typeof m.Body === 'string' ? JSON.parse(m.Body) : m.Body;
            const name = (body as { name?: string } | undefined)?.name as string;
            const payload = (body as { payload?: unknown } | undefined)?.payload as unknown;
            const h = handlers.get(name);
            if (h) await h(payload);
            if (m.ReceiptHandle) {
              await client.send(
                new DeleteMessageCommand({ QueueUrl: qUrl, ReceiptHandle: m.ReceiptHandle }),
              );
            }
          } catch (err) {
            console.error('[jobs:sqs] handler error', err);
          } finally {
            stopHeartbeat();
          }
        };

        if (isFifo) {
          for (const m of messages) {
            await processOne(m);
          }
        } else {
          for (const m of messages) {
            const p = processOne(m).finally(() => inFlight.delete(p));
            inFlight.add(p);
            // throttle submissions to concurrency
            while (inFlight.size >= concurrency) {
              await Promise.race([...inFlight]);
            }
          }
        }
      } catch (e) {
        console.warn('[jobs:sqs] poll error (retrying in 3s):', (e as Error).message);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    // stopping: wait for in-flight to finish
    await Promise.allSettled([...inFlight]);
  }

  function startHeartbeat(receiptHandle?: string | null): () => void {
    if (!receiptHandle) return () => {};
    let stopped = false;
    const t = setInterval(
      async () => {
        if (stopped) return;
        try {
          await client.send(
            new ChangeMessageVisibilityCommand({
              QueueUrl: qUrl,
              ReceiptHandle: receiptHandle,
              VisibilityTimeout: extendBySec,
            }),
          );
        } catch (e) {
          console.warn('[jobs:sqs] heartbeat error:', (e as Error).message);
        }
      },
      Math.max(heartbeatSec, 1) * 1000,
    );
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }

  return {
    async schedule(name, payload, opts) {
      if (opts.cron || opts.everyMs) {
        console.warn(
          '[jobs:sqs] repeat scheduling (cron/everyMs) not supported; use EventBridge Scheduler',
        );
      }
      const delayMs =
        typeof opts.delayMs === 'number'
          ? opts.delayMs
          : opts.runAt
            ? Math.max(0, opts.runAt.getTime() - Date.now())
            : 0;
      const DelaySeconds = Math.floor(delayMs / 1000);
      if (DelaySeconds > 900) {
        throw new Error('[jobs:sqs] delayMs/runAt exceeds 15 minutes (SQS limit)');
      }
      const messageBody = JSON.stringify({ name, payload });
      const params: {
        QueueUrl: string;
        MessageBody: string;
        DelaySeconds?: number;
        MessageGroupId?: string;
        MessageDeduplicationId?: string;
      } = {
        QueueUrl: qUrl,
        MessageBody: messageBody,
      };
      if (DelaySeconds > 0) Object.assign(params, { DelaySeconds });
      if (isFifo) {
        Object.assign(params, { MessageGroupId: groupId });
        if (opts.idempotencyKey)
          Object.assign(params, { MessageDeduplicationId: `${name}::${opts.idempotencyKey}` });
      }
      const res = (await client.send<SendResponse>(new SendMessageCommand(params))) as SendResponse;
      return { id: String(res.MessageId ?? '') };
    },
    async cancel() {
      // SQS does not support canceling enqueued messages; return 0.
      console.warn('[jobs:sqs] cancel is not supported for enqueued/scheduled messages');
      return 0;
    },
    process<T = unknown>(name: string, handler: (payload: T) => Promise<void>) {
      handlers.set(name, (p: unknown) => handler(p as T));
      // start polling once the first handler is registered
      void pollLoop();
    },
  } satisfies Jobs;
}
