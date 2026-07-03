import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import { TICKETS, getEventById } from '../data/events';
import { Icon } from '../components/common/Icon';

const STATUS_STYLES = {
  VALID: { bg: '#FDF6E3', color: '#8E6B1D', label: 'CONFIRMED' },
  USED: { bg: '#F7F3EB', color: '#A68A3E', label: 'ATTENDED' },
  REFUNDED: { bg: '#F7F3EB', color: '#A68A3E', label: 'REFUNDED' },
};

export default function MyTickets() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('up');
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const list = TICKETS.filter((t) => (tab === 'up' ? t.upcoming : !t.upcoming));

  return (
    <div style={{ background: '#F5F5F5', minHeight: 'calc(100vh - 120px)' }}>
      {/* Page Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div className="mx-auto max-w-container px-4 sm:px-6" style={{ paddingTop: 28, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E5C060, #C99E25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Ticket width={20} height={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#222', margin: 0, lineHeight: 1.2 }}>My Tickets</h1>
              <p style={{ fontSize: 13, color: '#888', margin: 0, marginTop: 2 }}>Manage your event bookings</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { key: 'up', label: 'Upcoming', count: TICKETS.filter(t => t.upcoming).length },
              { key: 'past', label: 'Past', count: TICKETS.filter(t => !t.upcoming).length },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: tab === t.key ? 600 : 400,
                  color: tab === t.key ? '#C99E25' : '#888',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '3px solid #C99E25' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {t.label}
                <span style={{
                  background: tab === t.key ? '#C99E25' : '#ddd',
                  color: tab === t.key ? '#fff' : '#888',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 10,
                  padding: '1px 7px',
                  lineHeight: '18px',
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-container px-4 sm:px-6" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {list.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎟️</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 6 }}>
              {tab === 'up' ? 'No upcoming tickets' : 'No past tickets'}
            </div>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>
              {tab === 'up' ? 'When you book an event, your tickets will appear here.' : 'Your attended events will show up here.'}
            </div>
            <button
              onClick={() => navigate('/events')}
              style={{
                background: 'linear-gradient(90deg, #E5C060, #C99E25, #8E6B1D)',
                color: '#000',
                border: 'none',
                borderRadius: 20,
                padding: '10px 28px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              Browse Events
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((t) => {
              const e = getEventById(t.evId);
              const s = STATUS_STYLES[t.status];
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/account/tickets/${t.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    background: '#fff',
                    borderRadius: 12,
                    border: 'none',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(ev) => {
                    ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                    ev.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(ev) => {
                    ev.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                    ev.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Left accent bar */}
                  <div style={{
                    width: 4,
                    background: 'linear-gradient(180deg, #E5C060, #C99E25)',
                    flexShrink: 0,
                  }} />

                  {/* Image */}
                  <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative', margin: '12px 0 12px 14px', borderRadius: 8, overflow: 'hidden' }}>
                    <EvImage seed={e.id} url={`https://picsum.photos/seed/obs-ev-${e.id}/300/300`} label={e.title} wmSize={18} />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, padding: '14px 16px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#222', lineHeight: 1.3, marginBottom: 4 }}>{e.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#777', lineHeight: 1.4 }}>
                      <Icon.Calendar width={13} height={13} style={{ flexShrink: 0 }} />
                      <span>{e.dateLabel}</span>
                      <span style={{ color: '#ccc' }}>·</span>
                      <Icon.Pin width={13} height={13} style={{ flexShrink: 0 }} />
                      <span>{e.venue}, {e.city}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, fontFamily: 'monospace', letterSpacing: 0.5 }}>{t.id}</div>
                  </div>

                  {/* Status + Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px 14px 0', flexShrink: 0 }}>
                    <span style={{
                      background: s.bg,
                      color: s.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 20,
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                    }}>
                      {s.label}
                    </span>
                    <Icon.ChevronRight width={14} height={14} style={{ color: '#ccc' }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
