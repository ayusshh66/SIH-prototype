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
        if (res.success) setTrains(res.data ?? []);
      })
      .catch(() => setTrains([]))
      .finally(() => setLoading(false));
  }, []);

  const normalizedTrains = (trains ?? []).map((train, index) => {
    const trainNumber = String(train?.trainNumber ?? train?.train_number ?? `TRAIN-${index + 1}`);
    const trainName = String(train?.trainName ?? train?.train_name ?? 'Unknown Train');
    const sectionId = String(train?.corridorId ?? train?.section_id ?? 'N/A');
    const trainType = String(train?.trainType ?? train?.train_type ?? 'PASSENGER');
    const direction = String(train?.direction ?? 'UP');
    const speedClass = String(train?.speed_class ?? train?.speedClass ?? 'NORMAL');
    const priorityValue = train?.priority ?? train?.priority_level ?? 'MEDIUM';
    const priority = typeof priorityValue === 'number'
      ? priorityValue >= 80 ? 'HIGH' : priorityValue >= 50 ? 'MEDIUM' : 'LOW'
      : String(priorityValue).toUpperCase();
    const start = train?.scheduledDeparture ?? train?.movement_start ?? train?.startTime ?? new Date().toISOString();
    const end = train?.scheduledArrival ?? train?.movement_end ?? train?.endTime ?? start;

    return {
      ...train,
      id: train?.id ?? train?.movement_id ?? `${trainNumber}-${index}`,
      trainNumber,
      trainName,
      sectionId,
      trainType,
      direction,
      speedClass,
      priority,
      start,
      end,
    };
  });

  const filteredTrains = normalizedTrains.filter((t) => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      String(t.trainNumber).toLowerCase().includes(searchText) ||
      String(t.trainName).toLowerCase().includes(searchText) ||
      String(t.sectionId).toLowerCase().includes(searchText);
    const matchesType = typeFilter === 'ALL' || t.trainType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trains & Movement Timetable"
        description="Scheduled passenger and freight train paths, speed classes, and estimated maintenance disruption penalties."
        badge={
          <span className="px-2 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded font-mono text-[10px] font-bold uppercase tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            {trains.length} SERVICES TRACKED
          </span>
        }
      />

      {/* ── Search & Filter Controls ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative flex-1 min-w-[240px] max-w-md z-10">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search train no., name, or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#06B6D4]/50 transition-colors placeholder:text-gray-600"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs z-10">
          <span className="text-gray-500 uppercase font-bold tracking-widest text-[10px] mr-2">Type:</span>
          {['ALL', 'EXPRESS', 'PASSENGER', 'GOODS'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 border rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors ${
                typeFilter === type
                  ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-black/40 text-gray-500 border-white/10 hover:text-white'
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
          <div className="p-12 border border-white/5 border-dashed rounded-xl bg-black/20 text-center font-mono text-[10px] text-gray-500 tracking-widest font-bold uppercase flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-[#06B6D4] border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            LOADING TRAIN MOVEMENT DATA...
          </div>
        ) : filteredTrains.length === 0 ? (
          <div className="p-12 border border-white/5 border-dashed rounded-xl bg-black/20 text-center font-mono text-[10px] text-gray-500 tracking-widest font-bold uppercase">
            NO TRAINS MATCHING QUERY.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrains.map((train) => {
              const startTime = new Date(train.start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              const endTime = new Date(train.end).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              return (
                <div
                  key={train.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/30 transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-[260px]">
                    <div className="w-10 h-10 bg-black/50 rounded-lg border border-white/10 flex items-center justify-center text-[#06B6D4] shrink-0 group-hover:scale-110 group-hover:bg-[#06B6D4]/10 transition-all group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <Train size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-white tracking-widest">
                          {train.trainNumber}
                        </span>
                        <span className="font-medium text-xs text-gray-300">
                          {train.trainName}
                        </span>
                        <span
                          className={`px-2 py-0.5 font-mono text-[9px] rounded font-bold uppercase tracking-widest border ${
                            train.trainType === 'EXPRESS'
                              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                              : train.trainType === 'GOODS'
                              ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                              : 'bg-black/50 text-gray-400 border-white/10'
                          }`}
                        >
                          {train.trainType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-2">
                        <span className="flex items-center gap-1">
                          <Navigation size={10} className="text-[#3B82F6]" /> {train.direction} LINE
                        </span>
                        <span className="text-gray-700">•</span>
                        <span>SPEED: <span className="text-gray-300">{train.speedClass}</span></span>
                        <span className="text-gray-700">•</span>
                        <span>SECTION: <span className="text-gray-300">{train.sectionId}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Timetable Slot */}
                  <div className="flex items-center gap-6 font-mono">
                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-widest mb-1">Passage Window</span>
                      <span className="font-bold text-white text-sm tracking-wider flex items-center justify-end">
                        {startTime} <ArrowRight size={12} className="mx-2 text-gray-500" /> {endTime}
                      </span>
                    </div>

                    <div className="pl-6 border-l border-white/10">
                      <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-widest mb-1">Priority</span>
                      <span
                        className={`font-bold text-sm tracking-widest ${
                          train.priority === 'HIGH'
                            ? 'text-[#EF4444] drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                            : train.priority === 'MEDIUM'
                            ? 'text-[#F59E0B] drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]'
                            : 'text-gray-500'
                        }`}
                      >
                        {train.priority}
                      </span>
                    </div>

                    <div className="pl-6 border-l border-white/10">
                      <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-widest mb-1">Status</span>
                      <span className="px-2 py-1 bg-[#10B981]/10 text-[#10B981] rounded border border-[#10B981]/30 text-[10px] font-bold tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.2)]">
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
