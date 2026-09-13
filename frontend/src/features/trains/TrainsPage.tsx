import React, { useEffect, useState } from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { Card } from '../../components/common/Card';
import { getTrainMovements } from '../../api/client';
import { Train, ArrowRight, Search, Navigation } from 'lucide-react';

export const TrainsPage: React.FC = () => {
  const [trains, setTrains] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainMovements()
      .then((res) => {
        if (res.success) setTrains(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTrains = trains.filter((t) => {
    const matchesSearch =
      t.train_number.toLowerCase().includes(search.toLowerCase()) ||
      t.train_name.toLowerCase().includes(search.toLowerCase()) ||
      t.section_id.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.train_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trains & Movement Timetable"
        description="Scheduled passenger and freight train paths, speed classes, and estimated maintenance disruption penalties."
        badge={
          <span className="px-2.5 py-1 bg-status-optimal/10 text-status-optimal border border-status-optimal font-mono text-xs font-bold uppercase">
            {trains.length} SERVICES TRACKED
          </span>
        }
      />

      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-card border-2 border-surface-border p-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search train no., name, or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background-main border border-surface-border pl-9 pr-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-text-primary"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-text-muted uppercase font-bold">Type:</span>
          {['ALL', 'EXPRESS', 'PASSENGER', 'GOODS'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 border font-bold uppercase transition-colors ${
                typeFilter === type
                  ? 'bg-status-primary text-background-main border-status-primary'
                  : 'bg-background-main text-text-muted border-surface-border hover:text-text-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ── Trains Table / Grid ──────────────────────────────────── */}
      <Card
        title="Active Section Train Movements"
        subtitle="NDLS-AGC Golden Quadrilateral corridor passage slots and speed profiles"
      >
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-text-muted">
            LOADING TRAIN MOVEMENT DATA...
          </div>
        ) : filteredTrains.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-text-muted">
            NO TRAINS MATCHING QUERY.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrains.map((train) => {
              const startTime = new Date(train.movement_start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              const endTime = new Date(train.movement_end).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              return (
                <div
                  key={train.movement_id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 bg-background-main border-2 border-surface-border hover:border-text-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[260px]">
                    <div className="w-10 h-10 bg-surface-card border-2 border-surface-border flex items-center justify-center text-text-cyan shrink-0">
                      <Train size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-text-primary">
                          {train.train_number}
                        </span>
                        <span className="font-medium text-xs text-text-primary">
                          {train.train_name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                            train.train_type === 'EXPRESS'
                              ? 'bg-status-optimal/10 text-status-optimal border-status-optimal/40'
                              : train.train_type === 'GOODS'
                              ? 'bg-status-warning/10 text-status-warning border-status-warning/40'
                              : 'bg-surface-card text-text-muted border-surface-border'
                          }`}
                        >
                          {train.train_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted mt-1">
                        <span className="flex items-center gap-1">
                          <Navigation size={11} /> {train.direction} LINE
                        </span>
                        <span>•</span>
                        <span>SPEED: {train.speed_class}</span>
                        <span>•</span>
                        <span>SECTION: {train.section_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timetable Slot */}
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-text-muted block uppercase">Passage Window</span>
                      <span className="font-bold text-text-primary">
                        {startTime} <ArrowRight size={11} className="inline mx-1 text-text-muted" /> {endTime}
                      </span>
                    </div>

                    <div className="pl-3 border-l border-surface-border">
                      <span className="text-[10px] text-text-muted block uppercase">Priority</span>
                      <span
                        className={`font-bold ${
                          train.priority === 'HIGH'
                            ? 'text-status-critical'
                            : train.priority === 'MEDIUM'
                            ? 'text-status-warning'
                            : 'text-text-muted'
                        }`}
                      >
                        {train.priority}
                      </span>
                    </div>

                    <div className="pl-3 border-l border-surface-border">
                      <span className="text-[10px] text-text-muted block uppercase">Status</span>
                      <span className="px-2 py-0.5 bg-status-optimal/10 text-status-optimal border border-status-optimal/30 text-[10px] font-bold">
                        ON TIME
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TrainsPage;
