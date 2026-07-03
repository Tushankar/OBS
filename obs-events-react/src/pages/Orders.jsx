import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ORDERS, TICKETS, getEventById, formatPrice } from '../data/events';
import { Icon } from '../components/common/Icon';

const STATUS_STYLES = {
  PAID: { bg: '#FDF6E3', color: '#8E6B1D', label: 'PAID' },
  REFUNDED: { bg: '#F7F3EB', color: '#A68A3E', label: 'REFUNDED' },
};

export default function Orders() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: '#F5F5F5', minHeight: 'calc(100vh - 120px)' }}>
      {/* Page Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div className="mx-auto max-w-container px-4 sm:px-6" style={{ paddingTop: 28, paddingBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E5C060, #C99E25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.CreditCard width={20} height={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#222', margin: 0, lineHeight: 1.2 }}>Order History</h1>
              <p style={{ fontSize: 13, color: '#888', margin: 0, marginTop: 2 }}>View all your past transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-container px-4 sm:px-6" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {/* Desktop Table */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid" style={{
            gridTemplateColumns: '1fr 2.5fr 1fr 1fr 0.8fr',
            padding: '14px 20px',
            background: 'linear-gradient(90deg, #FDF6E3, #F7F3EB)',
            borderBottom: '1px solid #f0ead8',
            fontSize: 11,
            fontWeight: 700,
            color: '#8E6B1D',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}>
            <div>Order ID</div>
            <div>Event</div>
            <div>Date</div>
            <div>Amount</div>
            <div style={{ textAlign: 'right' }}>Status</div>
          </div>

          {/* Rows */}
          {ORDERS.map((o, idx) => {
            const e = getEventById(o.evId);
            const s = STATUS_STYLES[o.status];
            return (
              <button
                key={o.id}
                onClick={() => navigate(`/account/tickets/${TICKETS[0].id}`)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 0,
                  background: 'none',
                  border: 'none',
                  borderTop: idx > 0 ? '1px solid #f5f5f5' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = '#FFFDF5'; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'none'; }}
              >
                {/* Desktop Row */}
                <div className="hidden md:grid" style={{
                  gridTemplateColumns: '1fr 2.5fr 1fr 1fr 0.8fr',
                  padding: '16px 20px',
                  alignItems: 'center',
                  fontSize: 14,
                }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#222', fontSize: 13, letterSpacing: 0.3 }}>{o.id}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'linear-gradient(135deg, #E5C060, #C99E25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon.Ticket width={16} height={16} style={{ color: '#fff' }} />
                    </div>
                    <span style={{ color: '#333', fontWeight: 500 }}>{e.title}</span>
                  </div>
                  <div style={{ color: '#888', fontSize: 13 }}>{o.date}</div>
                  <div style={{ fontWeight: 600, color: '#222' }}>{formatPrice(o.amount)}</div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      background: s.bg,
                      color: s.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 20,
                      letterSpacing: 0.5,
                    }}>
                      {s.label}
                    </span>
                  </div>
                </div>

                {/* Mobile Row */}
                <div className="md:hidden" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 4, height: 52, borderRadius: 2,
                      background: 'linear-gradient(180deg, #E5C060, #C99E25)',
                      flexShrink: 0, marginTop: 2,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#222', fontSize: 13 }}>{o.id}</span>
                        <span style={{
                          background: s.bg, color: s.color,
                          fontSize: 10, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 20,
                          letterSpacing: 0.5,
                        }}>
                          {s.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 4 }}>{e.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#999' }}>{o.date}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{formatPrice(o.amount)}</span>
                      </div>
                    </div>
                    <Icon.ChevronRight width={14} height={14} style={{ color: '#ccc', flexShrink: 0, marginTop: 18 }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
