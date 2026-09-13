import React, { useState } from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { OptimizationBadge } from '@/components/domain/OptimizationBadge';
import { Railway3DViewPlaceholder } from '@/components/domain/Railway3DViewPlaceholder';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { DepartmentBadge } from '@/components/domain/DepartmentBadge';
import { Play, ZoomIn, ZoomOut, Filter } from 'lucide-react';

/**
 * Planning Page
 * Architecture strictly fulfills Requirement §8:
 * Planning Page
 * ├── Planning Controls
 * ├── Schedule Timeline
 * └── Railway3DView
 */
export const PlanningPage: React.FC = () => {
  const [horizon, setHorizon] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [mode, setMode] = useState('BALANCED');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [activeTab, setActiveTab] = useState<'both' | 'timeline' | '3d'>('both');

  return (
    <div>
      <SectionHeader
        title="Corridor Planning & Schedule Visualizer"
        description="Multi-department maintenance possessions, train movement intervals, and spatial corridor twin."
        badge={<OptimizationBadge status="OPTIMAL" />}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Filter size={14} />}
              onClick={() => alert('Filter drawer reserved for Developer A')}
            >
              Filters
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Play size={14} />}
              onClick={() => alert('Triggering schedule optimization solver')}
            >
              Run Optimization
            </Button>
          </div>
        }
      />

      {/* ── 1. Planning Controls ─────────────────────────────────── */}
      <Card className="planning-controls-card" style={{ marginBottom: 'var(--space-5)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          {/* Horizon & Mode Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                HORIZON:
              </span>
              <div style={{ display: 'flex', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                <button
                  className={`btn btn-sm ${horizon === 'WEEKLY' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setHorizon('WEEKLY')}
                  style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
                >
                  Weekly (7D)
                </button>
                <button
                  className={`btn btn-sm ${horizon === 'MONTHLY' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setHorizon('MONTHLY')}
                  style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
                >
                  Monthly (30D)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                MODE:
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="input-control"
                style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
              >
                <option value="BALANCED">BALANCED (Multi-Objective)</option>
                <option value="SAFETY_FIRST">SAFETY_FIRST (Zero Overlap)</option>
                <option value="DISRUPTION_MINIMIZATION">DISRUPTION_MIN (Punctuality Priority)</option>
                <option value="EMERGENCY">EMERGENCY (Expedited Clearance)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                VIEW:
              </span>
              <div style={{ display: 'flex', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                <button
                  className={`btn btn-sm ${activeTab === 'both' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('both')}
                  style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
                >
                  Split View
                </button>
                <button
                  className={`btn btn-sm ${activeTab === 'timeline' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('timeline')}
                  style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
                >
                  Timeline Only
                </button>
                <button
                  className={`btn btn-sm ${activeTab === '3d' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('3d')}
                  style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
                >
                  3D View Only
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Zoom & Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              WINDOW: 2026-11-03 TO 2026-11-10
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              aria-label="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', minWidth: '36px', textAlign: 'center' }}>
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.25))}
              aria-label="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </Card>

      {/* ── 2. Schedule Timeline Placeholder ─────────────────────── */}
      {(activeTab === 'both' || activeTab === 'timeline') && (
        <Card
          title="Schedule Timeline Canvas"
          subtitle="Gantt-style possession block bars with spatial corridor alignment (Km 0 - 195)"
          actions={
            <div style={{ display: 'flex', gap: '6px' }}>
              <DepartmentBadge department="ENG" />
              <DepartmentBadge department="TRD" />
              <DepartmentBadge department="SNT" />
            </div>
          }
          style={{ marginBottom: 'var(--space-5)' }}
        >
          {/* Mock Timeline Preview Canvas */}
          <div
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {/* Time ruler bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px repeat(6, 1fr)',
                borderBottom: '1px solid var(--border-default)',
                paddingBottom: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              <span>SECTION</span>
              <span>20:00</span>
              <span>22:00</span>
              <span>00:00 (NIGHT)</span>
              <span>02:00 (NIGHT)</span>
              <span>04:00</span>
              <span>06:00</span>
            </div>

            {/* Track 1: NDLS - AGC (Km 0 - 60) */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                Km 0-60
              </span>
              <div
                style={{
                  height: '38px',
                  background: 'var(--bg-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Night window overlay band */}
                <div
                  style={{
                    position: 'absolute',
                    left: '33%',
                    width: '33%',
                    top: 0,
                    bottom: 0,
                    background: 'rgba(37, 99, 235, 0.05)',
                    borderLeft: '1px dashed rgba(37, 99, 235, 0.2)',
                    borderRight: '1px dashed rgba(37, 99, 235, 0.2)',
                  }}
                  title="Approved Night Possession Window (23:00 - 04:00)"
                />
                {/* Sample Block Bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: '38%',
                    width: '24%',
                    top: '4px',
                    bottom: '4px',
                    background: 'linear-gradient(90deg, #1D4ED8, #3B82F6)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                    cursor: 'pointer',
                  }}
                  title="Block BLK-NDLS-01 (150 mins) — Multi-Department"
                  onClick={() => alert('Block detail drawer will open here.')}
                >
                  <span>BLK-NDLS-01 [ENG + TRD]</span>
                  <span style={{ fontSize: '10px', color: '#93C5FD' }}>150m (95m saved)</span>
                </div>
              </div>
            </div>

            {/* Track 2: AGC Section (Km 120 - 180) */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                Km 120-180
              </span>
              <div
                style={{
                  height: '38px',
                  background: 'var(--bg-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Sample Secondary Block Bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: '52%',
                    width: '18%',
                    top: '4px',
                    bottom: '4px',
                    background: 'linear-gradient(90deg, #059669, #10B981)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                    cursor: 'pointer',
                  }}
                  title="Block BLK-AGC-02 (S&T Interlocking Maintenance)"
                >
                  <span>BLK-AGC-02 [SNT]</span>
                  <span style={{ fontSize: '10px', color: '#A7F3D0' }}>120m</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
              <span>Interactive timeline canvas ready for Developer A Schedule Implementation.</span>
              <span style={{ color: 'var(--status-optimal)' }}>✓ ZERO HARD CONFLICTS IN ACTIVE VIEW</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── 3. Railway3DView Placeholder ─────────────────────────── */}
      {(activeTab === 'both' || activeTab === '3d') && (
        <Card
          title="Railway Digital Twin 3D Viewport"
          subtitle="Spatial track geography, overhead catenary structures, and asset elevation models"
          actions={
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              MOUNT_SURFACE_ACTIVE
            </span>
          }
        >
          <Railway3DViewPlaceholder
            corridorId="NDLS-AGC"
            selectedBlockId="BLK-NDLS-01"
            zoomLevel={zoomLevel}
          />
        </Card>
      )}
    </div>
  );
};
