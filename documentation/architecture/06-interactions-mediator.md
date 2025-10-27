# Cross-module Interactions & Mediator

## Contracts & Ports

```ts
// modules/billing/interfaces/payment.ts
export interface PaymentsPort {
  charge(opts: { userId: string; amount: number }): Promise<{ id: string }>;
}
```

## Mediator (optional orchestration layer)

```ts
// core/mediator/types.ts
export interface Request<TRes> {
  __res?: TRes;
}
export interface Handler<TReq extends Request<any>, TRes> {
  handle(req: TReq): Promise<TRes>;
}
export type Pipeline = (next: () => Promise<unknown>, req: Request<any>) => Promise<unknown>;
```

```ts
// core/mediator/index.ts
export class Mediator {
  private handlers = new Map<string, Handler<any, any>>();
  private pipelines: Pipeline[] = [];
  on<TReq extends Request<TRes>, TRes>(key: string, h: Handler<TReq, TRes>) {
    this.handlers.set(key, h);
  }
  use(p: Pipeline) {
    this.pipelines.push(p);
  }
  async send<TReq extends Request<TRes>, TRes>(key: string, req: TReq): Promise<TRes> {
    const h = this.handlers.get(key);
    if (!h) throw new Error(`No handler for ${key}`);
    const run = async () => h.handle(req);
    const piped = this.pipelines.reduceRight((next, p) => () => p(next, req), run);
    return await (piped() as Promise<TRes>);
  }
}
```

## Example Usecase

```ts
// modules/users/usecases/CreateUserAndCustomer.ts
export const CreateUserAndCustomerKey = 'users.create_user_and_customer';
export interface CreateUserAndCustomerReq extends Request<{ userId: string; customerId: string }> {
  email: string;
  name: string;
}
```
