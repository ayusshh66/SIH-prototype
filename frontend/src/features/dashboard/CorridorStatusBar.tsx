import React from 'react';

interface CorridorSection {
  name: string;
  code: string;
  kmRange: string;
  status: 'optimal' | 'busy' | 'critical' | 'normal';
  occupancyPct: number;
  activeTrains: number;
}

const SECTIONS: CorridorSection[] = [
  { name: 'New Delhi - TKD', code: 'NDLS-TKD', kmRange: '0-18', status: 'normal', occupancyPct: 65, activeTrains: 4 },
  { name: 'Tughlakabad - FDB', code: 'TKD-FDB', kmRange: '18-30', status: 'busy', occupancyPct: 82, activeTrains: 5 },
  { name: 'Faridabad - Palwal', code: 'FDB-PWL', kmRange: '30-60', status: 'critical', occupancyPct: 91, activeTrains: 6 },
  { name: 'Palwal - Kosi Kalan', code: 'PWL-KSV', kmRange: '60-102', status: 'normal', occupancyPct: 54, activeTrains: 3 },
  { name: 'Kosi Kalan - Mathura', code: 'KSV-MTJ', kmRange: '102-141', status: 'optimal', occupancyPct: 40, activeTrains: 2 },
  { name: 'Mathura - Agra Cantt', code: 'MTJ-AGC', kmRange: '141-195', status: 'busy', occupancyPct: 78, activeTrains: 4 },
];

export const CorridorStatusBar: React.FC = () => {
  return (
    <div className="bg-surface border border-border-hairline rounded-md p-4 flex flex-col gap-3">
      {/* Top Header metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-micro font-mono uppercase tracking-wider text-content-tertiary">
            Corridor Status Strip
          </span>
          <span className="font-mono font-semibold text-small text-content-primary">
            NDLS-AGC (Km 0.000 → 195.000)
          </span>
        </div>

        <div className="flex items-center gap-4 text-micro font-mono text-content-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-feasible" /> Feasible (&lt;60%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-partial" /> Heavy (60-85%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-crit-p1" /> Saturated (&gt;85%)
          </span>
        </div>
      </div>

      {/* Multi-section Segment Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {SECTIONS.map((sec) => {
          let badgeBorder = 'border-border-hairline';
          let statusDot = 'bg-status-feasible';
          let statusText = 'text-status-feasible';

          if (sec.status === 'critical') {
            badgeBorder = 'border-crit-p1/40 bg-crit-p1-bg';
            statusDot = 'bg-crit-p1';
            statusText = 'text-crit-p1';
          } else if (sec.status === 'busy') {
            badgeBorder = 'border-crit-p2/40 bg-crit-p2-bg';
            statusDot = 'bg-crit-p2';
            statusText = 'text-crit-p2';
          } else if (sec.status === 'optimal') {
            badgeBorder = 'border-status-feasible/40 bg-status-feasible-bg';
            statusDot = 'bg-status-feasible';
            statusText = 'text-status-feasible';
          } else {
            badgeBorder = 'border-border-hairline bg-surface-sunken';
            statusDot = 'bg-accent-400';
            statusText = 'text-accent-400';
          }

          return (
            <div
              key={sec.code}
              className={`p-2.5 rounded-sm border ${badgeBorder} flex flex-col justify-between transition-colors`}
            >
              <div className="flex items-center justify-between text-micro font-mono mb-1.5">
                <span className="font-semibold text-content-primary">{sec.code}</span>
                <span className={`flex items-center gap-1 ${statusText}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                  {sec.occupancyPct}%
                </span>
              </div>

              {/* Mini occupancy progress bar */}
              <div className="w-full h-1 bg-surface-sunken rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full ${statusDot}`}
                  style={{ width: `${sec.occupancyPct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-content-tertiary">
                <span>Km {sec.kmRange}</span>
                <span>{sec.activeTrains} trains</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CorridorStatusBar;
