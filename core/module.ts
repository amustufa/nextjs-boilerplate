import type { Services, ServicesBuilder } from './services';

export type Module = {
  name: string;
  register: (builder: ServicesBuilder) => void;
  // services is a promise resolved at runtime bootstrap
  boot?: (ctx: { services: Promise<Services> }) => Promise<void> | void;
};

export async function loadModules(
  mods: Module[],
  builder: ServicesBuilder,
  services: Promise<Services>,
): Promise<void> {
  for (const m of mods) m.register(builder);
  for (const m of mods) if (m.boot) await m.boot({ services });
}
