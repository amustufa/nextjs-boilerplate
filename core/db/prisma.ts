// Runtime-aware Prisma client factory for node and edge.
// Note: The edge PrismaClient type differs; we coerce to the shared PrismaClient type in Services.
import { PrismaClient as PrismaClientNode } from '@prisma/client';
// Importing the edge client at build time is acceptable; it will be tree-shaken when unused.
// If bundling issues arise, switch to a dynamic import and make the services bootstrap async-aware.
import { PrismaClient as PrismaClientEdge } from '@prisma/client/edge';

type NodePrismaClient = PrismaClientNode;
type EdgePrismaClient = PrismaClientEdge;

let nodeClient: NodePrismaClient | undefined;
let edgeClient: EdgePrismaClient | undefined;

function createNodeClient(): NodePrismaClient {
  const PrismaClientCtor = (
    require('@prisma/client') as unknown as { PrismaClient: new () => NodePrismaClient }
  ).PrismaClient;
  return new PrismaClientCtor();
}

function createEdgeClient(): EdgePrismaClient {
  const PrismaClientCtor = (
    require('@prisma/client/edge') as unknown as { PrismaClient: new () => EdgePrismaClient }
  ).PrismaClient;
  return new PrismaClientCtor();
}

export function getPrisma(runtime: 'node' | 'edge' = 'node'): NodePrismaClient {
  if (runtime === 'edge') {
    if (!edgeClient) {
      edgeClient = createEdgeClient();
    }
    return edgeClient as unknown as NodePrismaClient;
  }
  if (!nodeClient) {
    nodeClient = createNodeClient();
  }
  return nodeClient;
}
