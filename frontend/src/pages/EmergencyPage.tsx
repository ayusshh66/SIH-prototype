import React from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Flame } from 'lucide-react';

export const EmergencyPage: React.FC = () => {
  return (
    <div>
      <SectionHeader
        title="Emergency Maintenance Planning"
        description="Expedited operational workflow for unscheduled safety-critical defects requiring immediate track possession."
        badge={
          <span className="badge badge-priority-critical">
            PRIORITY EXPEDITED
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-5)' }}>
        {/* Fast-Entry Incident Card */}
        <Card title="1. Fast-Entry Emergency Defect Intake">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="input-group">
              <label className="input-label">Defect Type</label>
              <select className="input-control">
                <option value="NEW_USFD_DEFECT">NEW_USFD_DEFECT (Transverse Rail Fissure)</option>
                <option value="TRACK_FAILURE">TRACK_FAILURE (Buckled Rail / Weld Failure)</option>
                <option value="SIGNAL_FAILURE">SIGNAL_FAILURE (Interlocking Drop)</option>
                <option value="OTHER">OTHER (Obstruction / Derailment Risk)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Kilometer Location</label>
              <input className="input-control font-mono" defaultValue="45.300" />
            </div>

            <Button
              variant="danger"
              icon={<Flame size={14} />}
              onClick={() => alert('Emergency defect evaluated — Ready for Developer B emergency re-optimizer.')}
            >
              Evaluate Emergency Slot
            </Button>
          </div>
        </Card>

        {/* Immediate Feasible Possession Slots */}
        <Card title="2. Expedited Feasible Possession Slots" subtitle="Minimum train disruption emergency windows">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--bg-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  Slot 1: 11:00 - 13:00 (120 Mins)
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Requires looping freight train BOXN-402 at Palwal
                </div>
              </div>
              <Button variant="outline" size="sm">
                Select Slot
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
