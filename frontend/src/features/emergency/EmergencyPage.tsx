import React, { useState } from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Flame, CheckCircle, AlertTriangle } from 'lucide-react';

export const EmergencyPage: React.FC = () => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Emergency Maintenance Planning"
        description="Expedited operational workflow for unscheduled safety-critical defects requiring immediate track possession."
        badge={
          <span className="badge badge-critical font-mono text-xs">
            PRIORITY EXPEDITED
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast-Entry Incident Card */}
        <Card title="1. Fast-Entry Emergency Defect Intake">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">Defect Type</label>
              <select className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none">
                <option value="NEW_USFD_DEFECT">NEW_USFD_DEFECT (Transverse Rail Fissure)</option>
                <option value="TRACK_FAILURE">TRACK_FAILURE (Buckled Rail / Weld Failure)</option>
                <option value="SIGNAL_FAILURE">SIGNAL_FAILURE (Interlocking Drop)</option>
                <option value="OTHER">OTHER (Obstruction / Derailment Risk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">Kilometer Location</label>
              <input
                className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none"
                defaultValue="45.300"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">Estimated Clearance Window (Minutes)</label>
              <input
                type="number"
                className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none"
                defaultValue="120"
              />
            </div>

            <Button
              variant="danger"
              icon={<Flame size={16} />}
              onClick={() => setSubmitted(true)}
            >
              Evaluate Emergency Slot
            </Button>

            {submitted && (
              <div className="p-3 bg-status-critical/10 border-2 border-status-critical text-status-critical text-xs font-mono flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>Emergency defect dispatched to optimization solver. Priority level set to P1 (IMMEDIATE).</span>
              </div>
            )}
          </div>
        </Card>

        {/* Immediate Feasible Possession Slots */}
        <Card title="2. Expedited Feasible Possession Slots" subtitle="Minimum train disruption emergency windows">
          <div className="space-y-3">
            {[
              { id: 'slot-1', time: '11:00 - 13:00 (120 Mins)', impact: 'Requires looping freight train BOXN-402 at Palwal' },
              { id: 'slot-2', time: '13:30 - 15:30 (120 Mins)', impact: 'Delays Gatimaan Express by 14 mins' },
              { id: 'slot-3', time: '16:00 - 18:00 (120 Mins)', impact: 'Overlaps existing TRD inspection block' },
            ].map((slot) => (
              <div
                key={slot.id}
                className={`p-4 bg-background-main border-2 transition-all flex items-center justify-between ${
                  selectedSlot === slot.id
                    ? 'border-status-optimal shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]'
                    : 'border-surface-border'
                }`}
              >
                <div>
                  <div className="font-mono text-sm font-bold text-text-primary">{slot.time}</div>
                  <div className="text-xs text-text-muted mt-1">{slot.impact}</div>
                </div>
                <Button
                  variant={selectedSlot === slot.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSlot(slot.id)}
                >
                  {selectedSlot === slot.id ? 'Selected' : 'Select Slot'}
                </Button>
              </div>
            ))}

            {selectedSlot && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<CheckCircle size={16} />}
                  onClick={() => alert(`Emergency slot ${selectedSlot} confirmed and broadcast to section controller.`)}
                >
                  Confirm Emergency Block Possession
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmergencyPage;
