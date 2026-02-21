'use client';

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PremiumGate from '@/components/PremiumGate';
import {
  GRAPH_NODES,
  GRAPH_EDGES,
  SECTOR_COLORS,
  SECTOR_LABELS,
  EDGE_TYPE_COLORS,
  EDGE_TYPE_LABELS,
  getSubgraph,
  getNodeConnections,
  findPath,
  getAllSectors,
  getAllEdgeTypes,
  GraphNode,
  GraphEdge,
} from '@/lib/supply-chain-graph';

// ============================================================
// Layout computation — sector columns
// ============================================================

const SECTOR_COLUMN_ORDER: GraphNode['sector'][] = [
  'government',
  'defense',
  'launch',
  'satellite',
  'infrastructure',
  'habitat',
  'communications',
  'propulsion',
  'electronics',
  'materials',
  'robotics',
  'analytics',
];

const TIER_ORDER: GraphNode['tier'][] = ['prime', 'tier1', 'tier2', 'startup'];

const NODE_RADIUS_BY_TIER: Record<GraphNode['tier'], number> = {
  prime: 22,
  tier1: 17,
  tier2: 13,
  startup: 10,
};

function computeLayout(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group nodes by sector
  const bySector = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const arr = bySector.get(node.sector) || [];
    arr.push(node);
    bySector.set(node.sector, arr);
  }

  // Sort each sector group by tier then alphabetically
  for (const [, arr] of Array.from(bySector.entries())) {
    arr.sort((a: GraphNode, b: GraphNode) => {
      const tierDiff = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return a.name.localeCompare(b.name);
    });
  }

  const colWidth = 180;
  const rowHeight = 52;
  const startX = 100;
  const startY = 60;

  let colIndex = 0;
  for (const sector of SECTOR_COLUMN_ORDER) {
    const sectorNodes = bySector.get(sector);
    if (!sectorNodes || sectorNodes.length === 0) continue;

    const x = startX + colIndex * colWidth;
    for (let i = 0; i < sectorNodes.length; i++) {
      const y = startY + i * rowHeight;
      positions.set(sectorNodes[i].id, { x, y });
    }
    colIndex++;
  }

  return positions;
}

// ============================================================
// SVG Graph Component
// ============================================================

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Map<string, { x: number; y: number }>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedPath: string[];
  onSelectNode: (id: string | null) => void;
  onHoverNode: (id: string | null) => void;
  zoom: number;
  panOffset: { x: number; y: number };
}

function GraphView({
  nodes,
  edges,
  positions,
  selectedNodeId,
  hoveredNodeId,
  highlightedPath,
  onSelectNode,
  onHoverNode,
  zoom,
  panOffset,
}: GraphViewProps) {
  // Calculate bounding box for viewBox
  const allPositions = Array.from(positions.values());
  const minX = Math.min(...allPositions.map((p) => p.x)) - 60;
  const minY = Math.min(...allPositions.map((p) => p.y)) - 40;
  const maxX = Math.max(...allPositions.map((p) => p.x)) + 60;
  const maxY = Math.max(...allPositions.map((p) => p.y)) + 40;
  const width = maxX - minX;
  const height = maxY - minY;

  // Active node's connections for highlighting
  const activeNodeId = hoveredNodeId || selectedNodeId;
  const activeConnections = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const connected = new Set<string>();
    for (const edge of edges) {
      if (edge.source === activeNodeId) connected.add(edge.target);
      if (edge.target === activeNodeId) connected.add(edge.source);
    }
    connected.add(activeNodeId);
    return connected;
  }, [activeNodeId, edges]);

  const pathSet = useMemo(() => new Set(highlightedPath), [highlightedPath]);
  const pathEdgeSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      set.add(`${highlightedPath[i]}--${highlightedPath[i + 1]}`);
      set.add(`${highlightedPath[i + 1]}--${highlightedPath[i]}`);
    }
    return set;
  }, [highlightedPath]);

  const isEdgeInPath = (e: GraphEdge) =>
    pathEdgeSet.has(`${e.source}--${e.target}`);

  const vbX = minX - panOffset.x / zoom;
  const vbY = minY - panOffset.y / zoom;
  const vbW = width / zoom;
  const vbH = height / zoom;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    >
      <defs>
        {/* Arrowhead markers for each edge type */}
        {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={color} opacity={0.6} />
          </marker>
        ))}
        <marker
          id="arrow-path"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#fbbf24" />
        </marker>
      </defs>

      {/* Sector column labels */}
      {(() => {
        const sectorXs = new Map<string, number>();
        for (const node of nodes) {
          const pos = positions.get(node.id);
          if (pos && !sectorXs.has(node.sector)) {
            sectorXs.set(node.sector, pos.x);
          }
        }
        return Array.from(sectorXs.entries()).map(([sector, x]) => (
          <text
            key={sector}
            x={x}
            y={startYForLabels(positions, nodes, sector) - 24}
            textAnchor="middle"
            className="text-[9px] font-semibold uppercase tracking-widest"
            fill={SECTOR_COLORS[sector as GraphNode['sector']] || '#94a3b8'}
            opacity={0.7}
          >
            {SECTOR_LABELS[sector as GraphNode['sector']] || sector}
          </text>
        ));
      })()}

      {/* Edges */}
      {edges.map((edge, i) => {
        const src = positions.get(edge.source);
        const tgt = positions.get(edge.target);
        if (!src || !tgt) return null;

        const inPath = isEdgeInPath(edge);
        const isActiveEdge =
          activeNodeId &&
          (edge.source === activeNodeId || edge.target === activeNodeId);
        const dimmed =
          (activeNodeId && !isActiveEdge && !inPath) ||
          (highlightedPath.length > 0 && !inPath);

        const color = inPath
          ? '#fbbf24'
          : EDGE_TYPE_COLORS[edge.type] || '#64748b';
        const opacity = dimmed ? 0.06 : inPath ? 1 : isActiveEdge ? 0.8 : 0.15;
        const strokeWidth = inPath ? 2.5 : isActiveEdge ? 1.5 : 0.8;

        // Curved path for edges in the same column (same x)
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const isSameCol = Math.abs(dx) < 10;
        let pathD: string;
        if (isSameCol) {
          const curveOffset = 40 + Math.abs(dy) * 0.15;
          pathD = `M ${src.x} ${src.y} C ${src.x + curveOffset} ${src.y}, ${tgt.x + curveOffset} ${tgt.y}, ${tgt.x} ${tgt.y}`;
        } else {
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          const cx = mx;
          const cy = my - Math.abs(dx) * 0.05;
          pathD = `M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`;
        }

        return (
          <path
            key={`edge-${i}`}
            d={pathD}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={opacity}
            markerEnd={
              inPath
                ? 'url(#arrow-path)'
                : isActiveEdge
                ? `url(#arrow-${edge.type})`
                : undefined
            }
            style={{ transition: 'opacity 0.2s ease' }}
          />
        );
      })}

      {/* Edge labels for active edges */}
      {activeNodeId &&
        edges
          .filter(
            (e) => e.source === activeNodeId || e.target === activeNodeId
          )
          .map((edge, i) => {
            const src = positions.get(edge.source);
            const tgt = positions.get(edge.target);
            if (!src || !tgt || !edge.label) return null;

            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2;

            return (
              <g key={`elabel-${i}`}>
                <rect
                  x={mx - 50}
                  y={my - 7}
                  width={100}
                  rx={3}
                  height={14}
                  fill="#1e293b"
                  opacity={0.9}
                  stroke={EDGE_TYPE_COLORS[edge.type]}
                  strokeWidth={0.5}
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  className="text-[6px]"
                >
                  {edge.label.length > 22
                    ? edge.label.slice(0, 22) + '...'
                    : edge.label}
                </text>
              </g>
            );
          })}

      {/* Path edge labels */}
      {highlightedPath.length > 1 &&
        (() => {
          const labels: React.ReactNode[] = [];
          for (let i = 0; i < highlightedPath.length - 1; i++) {
            const edge = edges.find(
              (e) =>
                (e.source === highlightedPath[i] && e.target === highlightedPath[i + 1]) ||
                (e.source === highlightedPath[i + 1] && e.target === highlightedPath[i])
            );
            if (!edge || !edge.label) continue;
            const src = positions.get(highlightedPath[i]);
            const tgt = positions.get(highlightedPath[i + 1]);
            if (!src || !tgt) continue;
            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2;
            labels.push(
              <g key={`plabel-${i}`}>
                <rect
                  x={mx - 55}
                  y={my - 8}
                  width={110}
                  height={16}
                  rx={4}
                  fill="#422006"
                  opacity={0.95}
                  stroke="#fbbf24"
                  strokeWidth={0.8}
                />
                <text
                  x={mx}
                  y={my + 4}
                  textAnchor="middle"
                  fill="#fde68a"
                  className="text-[6.5px] font-medium"
                >
                  {edge.label.length > 24
                    ? edge.label.slice(0, 24) + '...'
                    : edge.label}
                </text>
              </g>
            );
          }
          return labels;
        })()}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        const r = NODE_RADIUS_BY_TIER[node.tier];
        const isActive = node.id === activeNodeId;
        const isConnected = activeConnections.has(node.id);
        const isInPath = pathSet.has(node.id);
        const dimmed =
          (activeNodeId && !isConnected && !isInPath) ||
          (highlightedPath.length > 0 && !isInPath);
        const isSelected = node.id === selectedNodeId;
        const color = SECTOR_COLORS[node.sector];
        const opacity = dimmed ? 0.12 : 1;

        return (
          <g
            key={node.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(isSelected ? null : node.id);
            }}
            onMouseEnter={() => onHoverNode(node.id)}
            onMouseLeave={() => onHoverNode(null)}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
            opacity={opacity}
          >
            {/* Glow for selected / path */}
            {(isSelected || isInPath) && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r + 6}
                fill="none"
                stroke={isInPath ? '#fbbf24' : color}
                strokeWidth={2}
                opacity={0.5}
              />
            )}

            {/* Node circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={isActive ? color : `${color}33`}
              stroke={color}
              strokeWidth={isActive || isConnected ? 2 : 1}
            />

            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y + r + 11}
              textAnchor="middle"
              fill={dimmed ? '#475569' : '#e2e8f0'}
              className={`${r >= 17 ? 'text-[8px]' : 'text-[7px]'} font-medium`}
              style={{ transition: 'fill 0.2s ease' }}
            >
              {node.name.length > 18
                ? node.name.slice(0, 16) + '..'
                : node.name}
            </text>

            {/* Tier badge (for primes) */}
            {node.tier === 'prime' && (
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="white"
                className="text-[7px] font-bold"
              >
                P
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function startYForLabels(
  positions: Map<string, { x: number; y: number }>,
  nodes: GraphNode[],
  sector: string
): number {
  let minY = Infinity;
  for (const node of nodes) {
    if (node.sector === sector) {
      const pos = positions.get(node.id);
      if (pos && pos.y < minY) minY = pos.y;
    }
  }
  return minY === Infinity ? 60 : minY;
}

// ============================================================
// Detail Panel
// ============================================================

interface DetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
}

function DetailPanel({ node, edges, allNodes, onClose }: DetailPanelProps) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of allNodes) m.set(n.id, n);
    return m;
  }, [allNodes]);

  // Group edges by type
  const grouped = useMemo(() => {
    const g: Record<string, { edge: GraphEdge; otherNode: GraphNode | undefined }[]> = {};
    for (const edge of edges) {
      const otherId =
        edge.source === node.id ? edge.target : edge.source;
      const otherNode = nodeMap.get(otherId);

      // Determine display type relative to this node
      let displayType = edge.type;
      if (edge.type === 'supplier') {
        displayType = edge.source === node.id ? 'supplier' : 'customer';
      } else if (edge.type === 'customer') {
        displayType = edge.source === node.id ? 'customer' : 'supplier';
      }

      if (!g[displayType]) g[displayType] = [];
      g[displayType].push({ edge, otherNode });
    }
    return g;
  }, [edges, node.id, nodeMap]);

  const r = NODE_RADIUS_BY_TIER[node.tier];
  const color = SECTOR_COLORS[node.sector];

  return (
    <div className="bg-space-800 border border-space-700 rounded-xl p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: color }}
          >
            {node.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg leading-tight">
              {node.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${color}22`,
                  color: color,
                  border: `1px solid ${color}44`,
                }}
              >
                {SECTOR_LABELS[node.sector]}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 bg-space-700 px-2 py-0.5 rounded-full">
                {node.tier}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
          aria-label="Close detail panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {node.revenue && (
          <div>
            <div className="text-slate-500 text-xs">Revenue</div>
            <div className="text-white font-medium">{node.revenue}</div>
          </div>
        )}
        {node.employees && (
          <div>
            <div className="text-slate-500 text-xs">Employees</div>
            <div className="text-white font-medium">
              {node.employees.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Link to company profile */}
      {node.slug && (
        <Link
          href={`/company-profiles/${node.slug}`}
          className="block text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
        >
          View full company profile &rarr;
        </Link>
      )}

      {/* Connections by type */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300 border-b border-space-700 pb-1">
          Connections ({edges.length})
        </h4>
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    EDGE_TYPE_COLORS[type as GraphEdge['type']] || '#64748b',
                }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {EDGE_TYPE_LABELS[type as GraphEdge['type']] ||
                  type.replace(/_/g, ' ')}{' '}
                ({items.length})
              </span>
            </div>
            <div className="space-y-1 ml-4">
              {items.map(({ edge, otherNode }, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-300">
                    {otherNode?.name || 'Unknown'}
                  </span>
                  {edge.label && (
                    <span className="text-xs text-slate-500 truncate max-w-[140px]">
                      {edge.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Degrees of Separation Tool
// ============================================================

interface PathFinderProps {
  nodes: GraphNode[];
  onPathFound: (path: string[]) => void;
  onClear: () => void;
}

function PathFinder({ nodes, onPathFound, onClear }: PathFinderProps) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [result, setResult] = useState<{
    path: string[];
    degrees: number;
  } | null>(null);

  const sorted = useMemo(
    () => [...nodes].sort((a, b) => a.name.localeCompare(b.name)),
    [nodes]
  );

  const handleFind = () => {
    if (!fromId || !toId || fromId === toId) return;
    const path = findPath(fromId, toId);
    setResult({
      path,
      degrees: path.length > 0 ? path.length - 1 : -1,
    });
    onPathFound(path);
  };

  const handleClear = () => {
    setFromId('');
    setToId('');
    setResult(null);
    onClear();
  };

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  return (
    <div className="bg-space-800 border border-space-700 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber-400"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        Degrees of Separation
      </h4>
      <div className="space-y-2">
        <select
          value={fromId}
          onChange={(e) => {
            setFromId(e.target.value);
            setResult(null);
            onClear();
          }}
          className="w-full bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
        >
          <option value="">From company...</option>
          {sorted.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
        <select
          value={toId}
          onChange={(e) => {
            setToId(e.target.value);
            setResult(null);
            onClear();
          }}
          className="w-full bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
        >
          <option value="">To company...</option>
          {sorted.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleFind}
            disabled={!fromId || !toId || fromId === toId}
            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-space-700 disabled:text-slate-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Find Path
          </button>
          <button
            onClick={handleClear}
            className="px-3 bg-space-700 hover:bg-space-600 text-slate-400 text-sm py-2 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-2">
          {result.degrees >= 0 ? (
            <div className="space-y-2">
              <div className="text-center">
                <span className="text-2xl font-bold text-amber-400">
                  {result.degrees}
                </span>
                <span className="text-sm text-slate-400 ml-2">
                  degree{result.degrees !== 1 ? 's' : ''} of separation
                </span>
              </div>
              <div className="space-y-1">
                {result.path.map((id, idx) => {
                  const n = nodeMap.get(id);
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: n
                            ? SECTOR_COLORS[n.sector]
                            : '#64748b',
                        }}
                      />
                      <span className="text-slate-300">
                        {n?.name || id}
                      </span>
                      {idx < result.path.length - 1 && (
                        <span className="text-amber-500 text-xs ml-auto">
                          &darr;
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-400 text-center">
              No path found between these companies.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Page Content
// ============================================================

function SupplyChainMapContent() {
  const searchParams = useSearchParams();
  const initialCompany = searchParams.get('company');

  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialCompany
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilters, setSectorFilters] = useState<Set<GraphNode['sector']>>(
    new Set()
  );
  const [typeFilters, setTypeFilters] = useState<Set<GraphEdge['type']>>(
    new Set()
  );
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPathFinder, setShowPathFinder] = useState(false);

  // Drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Filtered graph
  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
    const sectorArr =
      sectorFilters.size > 0
        ? Array.from(sectorFilters)
        : undefined;
    const typeArr =
      typeFilters.size > 0 ? Array.from(typeFilters) : undefined;
    return getSubgraph(
      sectorArr as GraphNode['sector'][] | undefined,
      typeArr as GraphEdge['type'][] | undefined
    );
  }, [sectorFilters, typeFilters]);

  // Search filtering
  const displayNodes = useMemo(() => {
    if (!searchQuery) return filteredNodes;
    const q = searchQuery.toLowerCase();
    return filteredNodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) || n.sector.includes(q)
    );
  }, [filteredNodes, searchQuery]);

  // When search is active, only show edges connected to visible nodes
  const displayEdges = useMemo(() => {
    if (!searchQuery) return filteredEdges;
    const nodeIds = new Set(displayNodes.map((n) => n.id));
    return filteredEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
  }, [filteredEdges, displayNodes, searchQuery]);

  // Layout
  const positions = useMemo(
    () => computeLayout(displayNodes),
    [displayNodes]
  );

  // Selected node details
  const selectedDetails = useMemo(() => {
    if (!selectedNodeId) return null;
    return getNodeConnections(selectedNodeId);
  }, [selectedNodeId]);

  // All sectors and edge types
  const allSectors = useMemo(() => getAllSectors(), []);
  const allEdgeTypes = useMemo(() => getAllEdgeTypes(), []);

  // Toggle sector filter
  const toggleSector = useCallback(
    (sector: GraphNode['sector']) => {
      setSectorFilters((prev) => {
        const next = new Set(prev);
        if (next.has(sector)) {
          next.delete(sector);
        } else {
          next.add(sector);
        }
        return next;
      });
    },
    []
  );

  // Toggle edge type filter
  const toggleEdgeType = useCallback(
    (type: GraphEdge['type']) => {
      setTypeFilters((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        return next;
      });
    },
    []
  );

  // Zoom controls
  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(z * 1.25, 4)),
    []
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(z / 1.25, 0.3)),
    []
  );
  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setHighlightedPath([]);
    setSelectedNodeId(null);
    setHoveredNodeId(null);
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.3, Math.min(4, z * delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main Graph Area */}
      <div className="flex-1 min-w-0">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-space-800 border border-space-700 text-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || sectorFilters.size > 0 || typeFilters.size > 0
                ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
                : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {(sectorFilters.size > 0 || typeFilters.size > 0) && (
              <span className="bg-nebula-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {sectorFilters.size + typeFilters.size}
              </span>
            )}
          </button>

          {/* Path finder toggle */}
          <button
            onClick={() => setShowPathFinder(!showPathFinder)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showPathFinder
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Path Finder
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={zoomOut}
              className="w-8 h-8 bg-space-800 border border-space-700 rounded-lg text-slate-400 hover:text-white hover:border-space-600 flex items-center justify-center transition-colors"
              title="Zoom out"
            >
              -
            </button>
            <span className="text-xs text-slate-500 w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="w-8 h-8 bg-space-800 border border-space-700 rounded-lg text-slate-400 hover:text-white hover:border-space-600 flex items-center justify-center transition-colors"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={resetView}
              className="px-2 h-8 bg-space-800 border border-space-700 rounded-lg text-slate-400 hover:text-white hover:border-space-600 flex items-center justify-center text-xs transition-colors ml-1"
              title="Reset view"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-space-800 border border-space-700 rounded-xl p-4 mb-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Sectors
              </h4>
              <div className="flex flex-wrap gap-2">
                {allSectors.map((sector) => (
                  <button
                    key={sector}
                    onClick={() => toggleSector(sector)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      sectorFilters.size === 0 || sectorFilters.has(sector)
                        ? 'border'
                        : 'border border-transparent opacity-40 hover:opacity-70'
                    }`}
                    style={{
                      borderColor:
                        sectorFilters.has(sector)
                          ? SECTOR_COLORS[sector]
                          : sectorFilters.size === 0
                          ? `${SECTOR_COLORS[sector]}66`
                          : 'transparent',
                      backgroundColor: sectorFilters.has(sector)
                        ? `${SECTOR_COLORS[sector]}22`
                        : 'transparent',
                      color: SECTOR_COLORS[sector],
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: SECTOR_COLORS[sector] }}
                    />
                    {SECTOR_LABELS[sector]}
                  </button>
                ))}
                {sectorFilters.size > 0 && (
                  <button
                    onClick={() => setSectorFilters(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Relationship Types
              </h4>
              <div className="flex flex-wrap gap-2">
                {allEdgeTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleEdgeType(type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      typeFilters.size === 0 || typeFilters.has(type)
                        ? 'border'
                        : 'border border-transparent opacity-40 hover:opacity-70'
                    }`}
                    style={{
                      borderColor:
                        typeFilters.has(type)
                          ? EDGE_TYPE_COLORS[type]
                          : typeFilters.size === 0
                          ? `${EDGE_TYPE_COLORS[type]}66`
                          : 'transparent',
                      backgroundColor: typeFilters.has(type)
                        ? `${EDGE_TYPE_COLORS[type]}22`
                        : 'transparent',
                      color: EDGE_TYPE_COLORS[type],
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: EDGE_TYPE_COLORS[type] }}
                    />
                    {EDGE_TYPE_LABELS[type]}
                  </button>
                ))}
                {typeFilters.size > 0 && (
                  <button
                    onClick={() => setTypeFilters(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
          <span>{displayNodes.length} companies</span>
          <span>{displayEdges.length} relationships</span>
          {sectorFilters.size > 0 && (
            <span>
              Filtering: {Array.from(sectorFilters).map((s) => SECTOR_LABELS[s]).join(', ')}
            </span>
          )}
        </div>

        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="bg-space-800/50 border border-space-700 rounded-xl overflow-hidden relative"
          style={{
            height: 'calc(100vh - 300px)',
            minHeight: '500px',
            cursor: isDragging.current ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {displayNodes.length > 0 ? (
            <GraphView
              nodes={displayNodes}
              edges={displayEdges}
              positions={positions}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              highlightedPath={highlightedPath}
              onSelectNode={setSelectedNodeId}
              onHoverNode={setHoveredNodeId}
              zoom={zoom}
              panOffset={panOffset}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No companies match the current filters.
            </div>
          )}

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 bg-space-900/90 backdrop-blur-sm border border-space-700 rounded-lg p-3 max-w-[280px]">
            <h5 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Legend
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-5 h-5 rounded-full border-2 border-slate-400 flex items-center justify-center text-[7px] font-bold text-slate-400">
                  P
                </div>
                Prime
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-4 h-4 rounded-full border border-slate-500" />
                Tier 1
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-3 h-3 rounded-full border border-slate-600" />
                Tier 2
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full border border-slate-600" />
                Startup
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-space-700 grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(EDGE_TYPE_LABELS).map(([type, label]) => (
                <div
                  key={type}
                  className="flex items-center gap-1.5 text-[10px] text-slate-400"
                >
                  <div
                    className="w-4 h-0.5 rounded"
                    style={{
                      backgroundColor:
                        EDGE_TYPE_COLORS[type as GraphEdge['type']],
                    }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Hover tooltip */}
          {hoveredNodeId && !selectedNodeId && (() => {
            const node = GRAPH_NODES.find((n) => n.id === hoveredNodeId);
            if (!node) return null;
            const connections = getNodeConnections(hoveredNodeId);
            return (
              <div className="absolute top-3 right-3 bg-space-900/95 backdrop-blur-sm border border-space-700 rounded-lg p-3 max-w-[200px] pointer-events-none">
                <div className="font-medium text-white text-sm">{node.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: SECTOR_COLORS[node.sector],
                      backgroundColor: `${SECTOR_COLORS[node.sector]}22`,
                    }}
                  >
                    {SECTOR_LABELS[node.sector]}
                  </span>
                  <span className="text-[10px] text-slate-500">{node.tier}</span>
                </div>
                {node.revenue && (
                  <div className="text-xs text-slate-400 mt-1">
                    Revenue: {node.revenue}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {connections.edges.length} connections
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        {/* Path finder */}
        {showPathFinder && (
          <PathFinder
            nodes={GRAPH_NODES}
            onPathFound={setHighlightedPath}
            onClear={() => setHighlightedPath([])}
          />
        )}

        {/* Selected company detail */}
        {selectedNodeId && selectedDetails?.node ? (
          <DetailPanel
            node={selectedDetails.node}
            edges={selectedDetails.edges}
            allNodes={GRAPH_NODES}
            onClose={() => setSelectedNodeId(null)}
          />
        ) : (
          <div className="bg-space-800 border border-space-700 rounded-xl p-5 text-center">
            <div className="text-slate-600 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">
              Click a node in the graph to view company details and connections.
            </p>
          </div>
        )}

        {/* Quick stats */}
        <div className="bg-space-800 border border-space-700 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Graph Statistics
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Total Companies</div>
              <div className="text-white font-semibold">
                {GRAPH_NODES.length}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Total Relationships</div>
              <div className="text-white font-semibold">
                {GRAPH_EDGES.length}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Sectors</div>
              <div className="text-white font-semibold">
                {allSectors.length}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Primes</div>
              <div className="text-white font-semibold">
                {GRAPH_NODES.filter((n) => n.tier === 'prime').length}
              </div>
            </div>
          </div>
        </div>

        {/* Top connected companies */}
        <div className="bg-space-800 border border-space-700 rounded-xl p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Most Connected
          </h4>
          <div className="space-y-2">
            {GRAPH_NODES.map((node) => ({
              node,
              count: GRAPH_EDGES.filter(
                (e) => e.source === node.id || e.target === node.id
              ).length,
            }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map(({ node, count }) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedNodeId === node.id
                      ? 'bg-space-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-space-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: SECTOR_COLORS[node.sector],
                      }}
                    />
                    <span className="truncate">{node.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums flex-shrink-0 ml-2">
                    {count}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Page Wrapper
// ============================================================

export default function SupplyChainMapPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Supply Chain Relationship Map"
          subtitle="Interactive visualization of supplier-customer relationships across 80+ space industry companies"
          icon="🔗"
          accentColor="cyan"
        >
          <div className="flex items-center gap-3">
            <Link href="/supply-chain" className="btn-secondary text-sm py-2 px-4">
              &larr; Supply Chain Intel
            </Link>
            <Link href="/" className="btn-secondary text-sm py-2 px-4">
              &larr; Dashboard
            </Link>
          </div>
        </AnimatedPageHeader>

        <PremiumGate requiredTier="pro" context="supply-chain-map" showPreview={true}>
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <SupplyChainMapContent />
          </Suspense>
        </PremiumGate>
      </div>
    </div>
  );
}
