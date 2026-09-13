import React from 'react';
import { Box, Layers, Compass, Maximize2 } from 'lucide-react';

export interface Railway3DViewProps {
  corridorId?: string;
  selectedBlockId?: string | null;
  zoomLevel?: number;
  className?: string;
}

/**
 * Railway3DView Placeholder Component.
 * Reserved mounting point for the future WebGL/Three.js Corridor Digital Twin.
 * Conforms to architectural requirement §8 without pulling in heavy 3D bundles prematurely.
 */
export const Railway3DViewPlaceholder: React.FC<Railway3DViewProps> = ({
  corridorId = 'NDLS-AGC',
  selectedBlockId,
  zoomLevel = 1.0,
  className = '',
}) => {
  return (
    <div className={`railway-3d-container ${className}`}>
      <div className="railway-3d-grid-lines" aria-hidden="true" />

      {/* Top technical HUD metadata */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          zIndex: 2,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-cyan)' }}>
          <Box size={14} />
          <span>DIGITAL_TWIN // 3D_VIEWPORT</span>
        </span>
        <span>CORRIDOR: {corridorId} (Km 0.000 - 195.000)</span>
        {selectedBlockId && <span>FOCUSED_BLOCK: {selectedBlockId}</span>}
      </div>

      {/* Top right viewport controls HUD */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          zIndex: 2,
        }}
      >
        <span style={{ background: 'var(--bg-surface-raised)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
          ZOOM: {zoomLevel.toFixed(1)}x
        </span>
        <span style={{ background: 'var(--bg-surface-raised)', padding: '2px 6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Compass size={12} />
          <span>BEARING: 164° SSE</span>
        </span>
        <button
          className="btn btn-ghost"
          style={{ padding: '2px 4px', color: 'var(--text-muted)' }}
          title="Toggle Fullscreen Viewport"
          aria-label="Toggle Fullscreen Viewport"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Center technical illustration & mounting cue */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-2)',
          zIndex: 2,
          textAlign: 'center',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-raised)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-cyan)',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)',
          }}
        >
          <Layers size={24} />
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Corridor Digital Twin 3D View
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Reserved mounting surface for 3D track geography, OHE cantenary, and asset elevations.
          </div>
        </div>
        <div
          style={{
            marginTop: 'var(--space-2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-cyan)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-cyan)' }} />
          <span>CANVAS READY FOR WebGL / Three.js MOUNT</span>
        </div>
      </div>

      {/* Bottom technical telemetry bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          zIndex: 2,
        }}
      >
        <span>TRACK_TYPE: BG 1676mm / 60kg UIC</span>
        <span>TRACTION: 25kV 50Hz AC OHE</span>
        <span>SECTION: AGRA_DIVISION_UP/DN</span>
      </div>
    </div>
  );
};
