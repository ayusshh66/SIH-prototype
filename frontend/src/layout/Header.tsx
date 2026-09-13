import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NAV_ITEMS } from '@/constants/navigation';
import { SAMPLE_CORRIDORS } from '@/mocks/sampleData';
import { MapPin, Clock, AlertTriangle, ShieldCheck, ChevronDown } from 'lucide-react';

export interface HeaderProps {
  activeCorridorId: string;
  onCorridorChange: (corridorId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCorridorId,
  onCorridorChange,
}) => {
  const location = useLocation();
  const currentNav = NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];
  const activeCorridor = SAMPLE_CORRIDORS.find((c) => c.id === activeCorridorId) || SAMPLE_CORRIDORS[0];

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as IST time (UTC+5:30)
      const istStr = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setTimeStr(`${istStr} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="app-header">
      {/* Left: Breadcrumbs & Current Page Title */}
      <div className="header-left">
        <div className="breadcrumb-area">
          <span>Operations Control</span>
          <span style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="current">{currentNav.label}</span>
        </div>
      </div>

      {/* Right: Corridor Selector, Live Clock, System Health */}
      <div className="header-right">
        {/* Corridor Selector */}
        <div style={{ position: 'relative' }}>
          <button
            className="corridor-selector-pill"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            title="Switch Corridor"
          >
            <MapPin size={13} />
            <span>{activeCorridor.code} (Km {activeCorridor.startKm.toFixed(0)} - {activeCorridor.endKm.toFixed(0)})</span>
            <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                backgroundColor: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-panel)',
                width: '280px',
                zIndex: 60,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                SELECT ACTIVE RAILWAY CORRIDOR
              </div>
              {SAMPLE_CORRIDORS.map((corr) => (
                <button
                  key={corr.id}
                  onClick={() => {
                    onCorridorChange(corr.id);
                    setDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: corr.id === activeCorridorId ? 'var(--ir-blue-bg)' : 'transparent',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-xs)' }}>
                      {corr.code}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--status-optimal)', fontFamily: 'var(--font-mono)' }}>
                      {corr.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {corr.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Operations Clock */}
        <div className="clock-indicator" title="Indian Standard Time">
          <Clock size={12} style={{ color: 'var(--text-cyan)' }} />
          <span>{timeStr || '00:00:00 IST'}</span>
        </div>

        {/* Active Conflict Alert Shortcut */}
        <Link
          to="/conflicts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--priority-critical-bg)',
            border: '1px solid var(--priority-critical-border)',
            color: 'var(--priority-critical)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}
          title="3 Active Operational Conflicts"
        >
          <AlertTriangle size={12} />
          <span>3 CONFLICTS</span>
        </Link>

        {/* Engine Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--status-optimal-bg)',
            border: '1px solid var(--status-optimal-border)',
            color: 'var(--status-optimal)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}
          title="Deterministic Solver Engine Online"
        >
          <ShieldCheck size={12} />
          <span>AI ENGINE ONLINE</span>
        </div>
      </div>
    </header>
  );
};
