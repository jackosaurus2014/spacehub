import { NextResponse } from 'next/server';
import {
  GRAPH_NODES,
  GRAPH_EDGES,
  getSubgraph,
  getNodeConnections,
  findPath,
  GraphNode,
  GraphEdge,
} from '@/lib/supply-chain-graph';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const type = searchParams.get('type');
    const company = searchParams.get('company');
    const pathFrom = searchParams.get('pathFrom');
    const pathTo = searchParams.get('pathTo');

    // If pathFrom and pathTo are provided, return shortest path
    if (pathFrom && pathTo) {
      const path = findPath(pathFrom, pathTo);
      const pathNodes = path
        .map((id) => GRAPH_NODES.find((n) => n.id === id))
        .filter((n): n is GraphNode => n !== undefined);
      const pathEdges: GraphEdge[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const edge = GRAPH_EDGES.find(
          (e) =>
            (e.source === path[i] && e.target === path[i + 1]) ||
            (e.source === path[i + 1] && e.target === path[i])
        );
        if (edge) pathEdges.push(edge);
      }
      return NextResponse.json({
        path,
        pathNodes,
        pathEdges,
        degrees: path.length > 0 ? path.length - 1 : -1,
      });
    }

    // If company is provided, return that company's connections
    if (company) {
      const result = getNodeConnections(company);
      return NextResponse.json({
        node: result.node || null,
        edges: result.edges,
        connectedNodes: result.connectedNodes,
      });
    }

    // Otherwise return filtered graph
    const sectorFilter = sector
      ? (sector.split(',') as GraphNode['sector'][])
      : undefined;
    const typeFilter = type
      ? (type.split(',') as GraphEdge['type'][])
      : undefined;

    const { nodes, edges } = getSubgraph(sectorFilter, typeFilter);

    return NextResponse.json({
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        sectors: Array.from(new Set(nodes.map((n) => n.sector))),
        edgeTypes: Array.from(new Set(edges.map((e) => e.type))),
      },
    });
  } catch (error) {
    logger.error('Supply chain relationships API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch supply chain relationship data' },
      { status: 500 }
    );
  }
}
