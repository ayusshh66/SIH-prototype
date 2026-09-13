import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/constants/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}
      aria-label="Operations Navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="railway-brand">
          <div className="railway-emblem" aria-hidden="true">
            IR
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <div style={{ lineHeight: 1.1, fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                IR-ABPS
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '1px',
                }}
              >
                Block Planning
              </div>
            </div>
          )}
        </div>
        <button
          className="btn btn-ghost"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ padding: '4px', color: 'var(--text-muted)' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? `${item.label} — ${item.description}` : item.description}
            >
              <Icon className="nav-icon" aria-hidden="true" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={`nav-badge ${item.badgeType === 'danger' ? 'danger' : ''}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Operations Meta Footer */}
      {!collapsed && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }}>SIH26027 // PROTOTYPE</div>
          <div>SOLVER: MIP_DETERMINISTIC</div>
        </div>
      )}
    </aside>
  );
};
