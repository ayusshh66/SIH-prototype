import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Activity, Maximize2, RefreshCw } from 'lucide-react';

export interface Railway3DViewProps {
  corridorId?: string;
  selectedBlockId?: string | null;
  zoomLevel?: number;
  className?: string;
}

interface Station {
  name: string;
  code: string;
  km: number;
  x: number;
}

const STATIONS: Station[] = [
  { name: 'New Delhi', code: 'NDLS', km: 0, x: 50 },
  { name: 'Tughlakabad', code: 'TKD', km: 18, x: 160 },
  { name: 'Faridabad', code: 'FDB', km: 30, x: 260 },
  { name: 'Palwal', code: 'PWL', km: 60, x: 420 },
  { name: 'Kosi Kalan', code: 'KSV', km: 102, x: 600 },
  { name: 'Mathura Jn', code: 'MTJ', km: 141, x: 760 },
  { name: 'Agra Cantt', code: 'AGC', km: 195, x: 920 },
];

export const Railway3DViewPlaceholder: React.FC<Railway3DViewProps> = ({
  corridorId = 'NDLS-AGC',
  selectedBlockId,
  className = '',
}) => {
  const [activeLine, setActiveLine] = useState<'UP' | 'DN' | 'BOTH'>('BOTH');
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  // Active maintenance blocks on corridor
  const activeBlocks = [
    { id: 'BLK-01', dept: 'eng', name: 'Track Renewal', x: 280, width: 90, track: 'UP', color: 'var(--dept-engineering)' },
    { id: 'BLK-02', dept: 'trd', name: 'OHE Inspection', x: 620, width: 80, track: 'DN', color: 'var(--dept-trd)' },
    { id: 'BLK-03', dept: 'snt', name: 'Interlocking Test', x: 440, width: 60, track: 'UP', color: 'var(--dept-snt)' },
  ];

  return (
    <div
      className={`relative w-full bg-surface border border-border-hairline rounded-md overflow-hidden flex flex-col ${className}`}
    >
      {/* Top technical HUD metadata */}
      <div className="px-4 py-2.5 border-b border-border-hairline bg-surface-sunken flex items-center justify-between text-micro font-mono text-content-tertiary">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-accent-400 font-semibold">
            <Activity size={13} className="animate-pulse text-accent-400" />
            LIVE CORRIDOR TELEMETRY
          </span>
          <span className="text-content-secondary">
            {corridorId} (Km 0.000 → 195.000)
          </span>
          {selectedBlockId && (
            <span className="text-accent-400 bg-accent-500/15 px-1.5 py-0.5 rounded-sm">
              TARGET: {selectedBlockId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border border-border-hairline overflow-hidden">
            {(['BOTH', 'UP', 'DN'] as const).map((line) => (
              <button
                key={line}
                onClick={() => setActiveLine(line)}
                className={`px-2 py-0.5 text-micro transition-colors cursor-pointer ${
                  activeLine === line
                    ? 'bg-accent-500 text-white font-medium'
                    : 'bg-surface hover:text-content-primary'
                }`}
              >
                {line}
              </button>
            ))}
          </div>

          <button
            className="p-1 rounded-sm text-content-tertiary hover:text-content-primary hover:bg-surface-raised transition-colors"
            title="Reset telemetry view"
          >
            <RefreshCw size={12} />
          </button>
          <button
            className="p-1 rounded-sm text-content-tertiary hover:text-content-primary hover:bg-surface-raised transition-colors"
            title="Fullscreen schematic"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Corridor Diagram Viewport */}
      <div className="relative w-full h-56 bg-surface-sunken/40 overflow-hidden flex items-center justify-center p-4">
        <svg
          viewBox="0 0 980 180"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Track tie hatch pattern */}
            <pattern id="trackTies" width="8" height="12" patternUnits="userSpaceOnUse">
              <line x1="4" y1="0" x2="4" y2="12" stroke="var(--border-hairline)" strokeWidth="1.5" />
            </pattern>
            {/* Block hazard stripe */}
            <pattern id="diagHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,159,67,0.4)" strokeWidth="3" />
            </pattern>
          </defs>

          {/* Grid reference hairline lines */}
          <line x1="30" y1="25" x2="950" y2="25" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="30" y1="155" x2="950" y2="155" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />

          {/* UP TRACK (Y = 65) */}
          {(activeLine === 'BOTH' || activeLine === 'UP') && (
            <g opacity={1}>
              {/* Sleeper base */}
              <rect x="40" y="59" width="890" height="12" fill="url(#trackTies)" opacity="0.6" />
              {/* Upper rail */}
              <line x1="40" y1="61" x2="930" y2="61" stroke="var(--border-strong)" strokeWidth="1.5" />
              {/* Lower rail */}
              <line x1="40" y1="69" x2="930" y2="69" stroke="var(--border-strong)" strokeWidth="1.5" />

              {/* Animated electrical/pulse track line */}
              <line
                x1="40"
                y1="65"
                x2="930"
                y2="65"
                stroke="var(--accent-400)"
                strokeWidth="1"
                strokeDasharray="8 12"
                className="animate-[dash_20s_linear_infinite]"
              />
              <text x="15" y="68" fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">
                UP
              </text>
            </g>
          )}

          {/* DN TRACK (Y = 115) */}
          {(activeLine === 'BOTH' || activeLine === 'DN') && (
            <g opacity={1}>
              {/* Sleeper base */}
              <rect x="40" y="109" width="890" height="12" fill="url(#trackTies)" opacity="0.6" />
              {/* Upper rail */}
              <line x1="40" y1="111" x2="930" y2="111" stroke="var(--border-strong)" strokeWidth="1.5" />
              {/* Lower rail */}
              <line x1="40" y1="119" x2="930" y2="119" stroke="var(--border-strong)" strokeWidth="1.5" />

              {/* Animated reverse electrical pulse line */}
              <line
                x1="40"
                y1="115"
                x2="930"
                y2="115"
                stroke="var(--dept-pway)"
                strokeWidth="1"
                strokeDasharray="8 12"
                className="animate-[dash-rev_22s_linear_infinite]"
              />
              <text x="15" y="118" fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">
                DN
              </text>
            </g>
          )}

          {/* Active Maintenance Blocks */}
          {activeBlocks.map((blk) => {
            const yPos = blk.track === 'UP' ? 57 : 107;
            const isMatch = selectedBlockId === blk.id;

            return (
              <g
                key={blk.id}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredEntity(`${blk.id}: ${blk.name}`)}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <rect
                  x={blk.x}
                  y={yPos}
                  width={blk.width}
                  height="16"
                  rx="3"
                  fill={blk.color}
                  fillOpacity={isMatch ? 0.35 : 0.2}
                  stroke={blk.color}
                  strokeWidth={isMatch ? 2 : 1}
                />
                <rect
                  x={blk.x}
                  y={yPos}
                  width={blk.width}
                  height="16"
                  rx="3"
                  fill="url(#diagHatch)"
                  opacity="0.6"
                />
                <text
                  x={blk.x + blk.width / 2}
                  y={yPos + 11}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="8.5"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                >
                  {blk.id}
                </text>
              </g>
            );
          })}

          {/* Stations / Junction markers */}
          {STATIONS.map((stn) => (
            <g key={stn.code}>
              {/* Station vertical datum line */}
              <line
                x1={stn.x}
                y1="40"
                x2={stn.x}
                y2="140"
                stroke="var(--border-hairline)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Node dot on UP */}
              <circle cx={stn.x} cy="65" r="3" fill="var(--bg-canvas)" stroke="var(--text-secondary)" strokeWidth="1.5" />
              {/* Node dot on DN */}
              <circle cx={stn.x} cy="115" r="3" fill="var(--bg-canvas)" stroke="var(--text-secondary)" strokeWidth="1.5" />

              {/* Station Code & KM marker */}
              <text
                x={stn.x}
                y="35"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {stn.code}
              </text>
              <text
                x={stn.x}
                y="150"
                textAnchor="middle"
                fill="var(--text-tertiary)"
                fontSize="8"
                fontFamily="var(--font-mono)"
              >
                Km {stn.km}
              </text>
            </g>
          ))}

          {/* Moving Train Dot 1: Vande Bharat 22436 (UP track, moving right) */}
          <motion.g
            animate={{ x: [70, 890] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx={0}
              cy={65}
              r={4.5}
              fill="var(--accent-500)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="drop-shadow-[0_0_8px_rgba(47,111,238,0.8)]"
            />
          </motion.g>

          {/* Moving Train Dot 2: Rajdhani 12952 (DN track, moving left) */}
          <motion.g
            animate={{ x: [880, 80] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx={0}
              cy={115}
              r={4}
              fill="var(--crit-p4)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]"
            />
          </motion.g>

          {/* Moving Train Dot 3: Freight G-401 (UP track, slower) */}
          <motion.g
            animate={{ x: [150, 850] }}
            transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx={0}
              cy={65}
              r={3.5}
              fill="var(--crit-p2)"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </motion.g>
        </svg>

        {/* Hovered entity readout pill */}
        {hoveredEntity && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-surface-raised border border-border-hairline text-small font-mono px-3 py-1 rounded-sm shadow-floating text-content-primary pointer-events-none">
            {hoveredEntity}
          </div>
        )}
      </div>

      {/* Bottom technical telemetry bar */}
      <div className="px-4 py-2 border-t border-border-hairline bg-surface-sunken flex justify-between text-micro font-mono text-content-tertiary">
        <span>TRACK: BG 1676mm / 60kg UIC</span>
        <span>TRACTION: 25kV 50Hz AC OHE</span>
        <span className="text-content-secondary">ACTIVE BLOCKS: 3</span>
        <span>CORRIDOR SPEED CLASS: 130–160 km/h</span>
      </div>
    </div>
  );
};

export default Railway3DViewPlaceholder;
