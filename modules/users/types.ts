export type { CreateUserInput } from './contracts';
export type { UserListItem, UsersListResult } from './domain/projections/list.projection';
export type { UserRecord } from './domain/entities/user.entity';
import type { Envelope } from '@/core/types';
import type {
  UserListItem as _UserListItem,
  UsersListResult as _UsersListResult,
} from './domain/projections/list.projection';
export type UsersItemsEnvelope = Envelope<{ items: _UserListItem[] }>;
export type UsersQueryResult = {
  data: _UsersListResult | undefined;
  isLoading: boolean;
  error: string | null;
};
