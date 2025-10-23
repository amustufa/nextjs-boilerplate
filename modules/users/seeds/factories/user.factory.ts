import { faker } from '@faker-js/faker';

export type UserSeedData = {
  email: string;
  name: string;
};

export function makeUser(): UserSeedData {
  return {
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
  };
}

export function makeUsers(count: number): UserSeedData[] {
  return Array.from({ length: count }, () => makeUser());
}
