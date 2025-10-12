// Runtime-aware Prisma client factory for node and edge.
// Note: The edge PrismaClient type differs; we coerce to the shared PrismaClient type in Services.
import type { PrismaClient as NodePrismaClient } from '@prisma/client';
// Importing the edge client at build time is acceptable; it will be tree-shaken when unused.
// If bundling issues arise, switch to a dynamic import and make the services bootstrap async-aware.
import type { PrismaClient as EdgePrismaClient } from '@prisma/client/edge';

let nodeClient: NodePrismaClient | undefined;
let edgeClient: EdgePrismaClient | undefined;

export function getPrisma(runtime: 'node' | 'edge' = 'node'): NodePrismaClient {
  if (runtime === 'edge') {
    if (!edgeClient) {
      const { PrismaClient } = require('@prisma/client/edge') as {
        PrismaClient: new () => EdgePrismaClient;
      };
      edgeClient = new PrismaClient();
    }
    return edgeClient as unknown as NodePrismaClient;
  }
  if (!nodeClient) {
    const { PrismaClient } = require('@prisma/client') as {
      PrismaClient: new () => NodePrismaClient;
    };
    nodeClient = new PrismaClient();
  }
  return nodeClient;
}
