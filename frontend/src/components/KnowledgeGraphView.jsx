/**
 * VISION 2.0: Aircraft Health Knowledge Graph Visualizer
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Implements Entity-Relationship Traversal across:
 * - Aircraft Tail -> Engines -> 6 Subsystems -> Sensors -> Observations -> ATA Work Orders
 * - Interactive SVG entity graph with node filtering, search, and neighborhood highlighting
 * - Click node to inspect entity attributes and traversed connected edges
 * - Clear provenance demarcation stamp
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Cpu,
  Plane,
  Droplet,
  Eye,
  Wrench,
} from 'lucide-react';

const NODE_COLORS = {
  AIRCRAFT: { bg: '#0284c7', border: '#38bdf8', text: '#ffffff', label: 'Aircraft Tail' },
  ENGINE: { bg: '#0f766e', border: '#2dd4bf', text: '#ffffff', label: 'Turbofan Engine' },
  SUBSYSTEM: { bg: '#4338ca', border: '#818cf8', text: '#ffffff', label: 'Engine Subsystem' },
  SENSOR: { bg: '#0369a1', border: '#7dd3fc', text: '#ffffff', label: 'Sensor Channel' },
  OBSERVATION_OIL: { bg: '#b45309', border: '#fcd34d', text: '#ffffff', label: 'Oil Spectrometry' },
  OBSERVATION_OPTICAL: { bg: '#c2410c', border: '#fb923c', text: '#ffffff', label: 'Borescope Optical' },
  WORK_ORDER: { bg: '#7e22ce', border: '#c084fc', text: '#ffffff', label: 'ATA Work Order' },
};

export default function KnowledgeGraphView({
  unitId = 1,
  className = '',
}) {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch('http://localhost:8000/api/v1/graph/nodes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch graph data');
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setGraphData(json);
          setLoading(false);
          if (json.nodes && json.nodes.length > 0) {
            setSelectedNodeId(json.nodes[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Graph API Error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [unitId]);

  // Compute node positions in radial / layered layout for SVG
  const layout = useMemo(() => {
    const nodes = graphData.nodes || [];
    const width = 800;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;

    const positions = {};
    const typeOrder = ['AIRCRAFT', 'ENGINE', 'SUBSYSTEM', 'SENSOR', 'OBSERVATION_OIL', 'OBSERVATION_OPTICAL', 'WORK_ORDER'];

    typeOrder.forEach((t, typeIdx) => {
      const typeNodes = nodes.filter((n) => n.type === t);
      const radius = 55 + typeIdx * 48;
      const angleStep = (2 * Math.PI) / (typeNodes.length || 1);

      typeNodes.forEach((n, idx) => {
        const angle = idx * angleStep - Math.PI / 2 + (typeIdx * 0.3);
        positions[n.id] = {
          x: centerX + Math.cos(angle) * (radius + (idx % 2 === 0 ? 0 : 15)),
          y: centerY + Math.sin(angle) * (radius * 0.7 + (idx % 2 === 0 ? 0 : 10)),
        };
      });
    });

    return { positions, width, height };
  }, [graphData.nodes]);

  const selectedNode = graphData.nodes?.find((n) => n.id === selectedNodeId);

  // Connected edges to selected node
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return (graphData.edges || []).filter(
      (e) => e.source === selectedNodeId || e.target === selectedNodeId
    );
  }, [graphData.edges, selectedNodeId]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return (graphData.nodes || []).filter((n) => {
      if (filterType !== 'ALL' && n.type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          n.label?.toLowerCase().includes(q) ||
          n.id?.toLowerCase().includes(q) ||
          n.type?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [graphData.nodes, filterType, searchQuery]);

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* Header & Provenance Banner */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded">
                Relational Knowledge Graph
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {graphData.total_nodes || graphData.nodes?.length || 0} Entities &bull; {graphData.total_edges || graphData.edges?.length || 0} Relationships
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5 tracking-tight">
              Aircraft System Entity Traversal & Diagnostic Root Cause
            </h2>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono">
          <div className="text-slate-400 flex items-center space-x-1.5 justify-end">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Multi-Modal Graph Traversal</span>
          </div>
          <div className="text-indigo-400/90 text-[10px]">
            [PROVENANCE: ENTITY GRAPH ENGINE]
          </div>
        </div>
      </div>

      {/* Graph Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-mono">
          {['ALL', 'AIRCRAFT', 'ENGINE', 'SUBSYSTEM', 'SENSOR', 'OBSERVATION_OIL', 'WORK_ORDER'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-xl uppercase tracking-[0.08em] transition-all whitespace-nowrap ${
                filterType === t
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {NODE_COLORS[t]?.label || t}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search entity node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Interactive SVG Graph & Details Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* SVG Canvas (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-950/80 rounded-2xl border border-slate-800/80 p-2 relative shadow-2xl overflow-hidden aspect-[1.6/1]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500 font-mono text-xs">
              Constructing entity graph...
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="w-full h-full select-none"
            >
              <defs>
                <marker
                  id="graphArrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
                <marker
                  id="graphArrowActive"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
                </marker>
              </defs>

              {/* Edges */}
              {(graphData.edges || []).map((edge, idx) => {
                const sPos = layout.positions[edge.source];
                const tPos = layout.positions[edge.target];
                if (!sPos || !tPos) return null;

                const isConnected =
                  edge.source === selectedNodeId || edge.target === selectedNodeId;

                return (
                  <line
                    key={idx}
                    x1={sPos.x}
                    y1={sPos.y}
                    x2={tPos.x}
                    y2={tPos.y}
                    stroke={isConnected ? '#818cf8' : '#1e293b'}
                    strokeWidth={isConnected ? 2.2 : 1.0}
                    strokeDasharray={edge.relationship === 'REPEATED_DEFECT' ? '4 3' : 'none'}
                    markerEnd={isConnected ? 'url(#graphArrowActive)' : 'url(#graphArrow)'}
                    className="transition-colors duration-300"
                  />
                );
              })}

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const pos = layout.positions[node.id];
                if (!pos) return null;

                const isSelected = node.id === selectedNodeId;
                const nodeColor = NODE_COLORS[node.type] || NODE_COLORS.ENGINE;
                const isConnectedToSelected = connectedEdges.some(
                  (e) => e.source === node.id || e.target === node.id
                );

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    {/* Pulsing ring if selected */}
                    {isSelected && (
                      <circle
                        r="18"
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        className="animate-spin"
                      />
                    )}

                    <circle
                      r={isSelected ? 14 : isConnectedToSelected ? 12 : 10}
                      fill={nodeColor.bg}
                      stroke={isSelected ? '#ffffff' : nodeColor.border}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-all duration-200 hover:scale-125"
                    />

                    {/* Node Label Text */}
                    <text
                      y={isSelected ? 22 : 18}
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : isConnectedToSelected ? '#e2e8f0' : '#94a3b8'}
                      fontSize={isSelected ? '10' : '8'}
                      fontFamily="monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {node.label || node.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Legend Strip */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 text-[9px] font-mono bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
            {Object.entries(NODE_COLORS).slice(0, 5).map(([k, c]) => (
              <div key={k} className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.border }} />
                <span className="text-slate-400">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Entity Details Panel (1 Col) */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4">
          {selectedNode ? (
            <div className="space-y-3">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: NODE_COLORS[selectedNode.type]?.bg || '#4338ca' }}
                  >
                    {NODE_COLORS[selectedNode.type]?.label || selectedNode.type}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {selectedNode.id}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedNode.label || selectedNode.id}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">
                  {selectedNode.description || 'Entity active in the commercial aviation knowledge graph.'}
                </p>
              </div>

              {/* Attributes Map */}
              {selectedNode.attributes && (
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Entity Properties:
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-slate-300">
                    {Object.entries(selectedNode.attributes).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-white font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Relationships */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Connected Relationships ({connectedEdges.length}):
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {connectedEdges.map((e, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-400 truncate max-w-[90px]">
                        {e.source === selectedNodeId ? 'Target' : 'Source'}
                      </span>
                      <span className="text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-indigo-950/80 text-[10px]">
                        {e.relationship}
                      </span>
                      <span className="text-white font-semibold truncate max-w-[100px]">
                        {e.source === selectedNodeId ? e.target : e.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 font-mono text-xs">
              Select any graph entity node to inspect diagnostic root causes and relational linkages.
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            Bidirectional graph traversal active.
          </div>
        </div>
      </div>
    </div>
  );
}
