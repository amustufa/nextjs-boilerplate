import type { Cache } from '@/core/services';
import { userListSelect, type UserListRow } from '@/modules/users/data/selects';
import {
  toUserListItem,
  type UsersListResult,
} from '@/modules/users/domain/projections/list.projection';
import type { CreateUserInput } from '@/modules/users/contracts';
import type { UserRecord } from '@/modules/users/types';

type PrismaLike = {
  user: {
    create(args: { data: CreateUserInput }): Promise<UserRecord>;
    count(): Promise<number>;
    findMany(args: {
      select: typeof userListSelect;
      skip: number;
      take: number;
    }): Promise<UserListRow[]>;
  };
};

export class UsersService {
  constructor(
    private prisma: PrismaLike,
    private cache?: Cache,
  ) {}

  async create(data: CreateUserInput): Promise<UserRecord> {
    return this.prisma.user.create({ data });
  }

  async list(page = 1, perPage = 20): Promise<UsersListResult> {
    const key = `users:list:${page}:${perPage}`;
    const loader = async () => {
      const [total, rows] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.findMany({
          select: userListSelect,
          skip: (page - 1) * perPage,
          take: perPage,
        }),
      ]);
      const items = rows.map(toUserListItem);
      return { items, total };
    };
    if (this.cache) return this.cache.wrap(key, 60, loader);
    return loader();
  }
}
