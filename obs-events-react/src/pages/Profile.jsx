import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/common/Icon';

export default function Profile() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [form, setForm] = useState({ name: 'Bhavesh K', email: 'bhavesh@example.com', phone: '+91 98200 12345', address: '123, Lakeview Apartments', street: 'MG Road, Andheri West', city: 'Mumbai' });
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const initials = form.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const quickLinks = [
    { icon: 'Ticket', label: 'My Tickets', desc: 'View your upcoming & past tickets', to: '/account/tickets' },
    { icon: 'CreditCard', label: 'Order History', desc: 'View all your past transactions', to: '/account/orders' },
    { icon: 'Headphones', label: 'Help & Support', desc: 'Get help with your bookings', to: '/help' },
  ];

  const InputField = ({ label, keyName, type = 'text' }) => (
    <div>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600, color: '#888',
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={form[keyName]}
        onChange={field(keyName)}
        style={{
          width: '100%', height: 44, borderRadius: 8,
          border: '1.5px solid #e8e8e8', padding: '0 14px',
          fontSize: 14, color: '#222', outline: 'none',
          transition: 'border-color 0.2s ease', background: '#FAFAFA',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#C99E25'; e.currentTarget.style.background = '#fff'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.background = '#FAFAFA'; }}
      />
    </div>
  );

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
              <Icon.Settings width={20} height={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#222', margin: 0, lineHeight: 1.2 }}>Profile</h1>
              <p style={{ fontSize: 13, color: '#888', margin: 0, marginTop: 2 }}>Manage your account details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-container px-4 sm:px-6" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="profile-grid">

          {/* Left: Profile Card */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {/* Avatar Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #C99E25 0%, #E5C060 50%, #C99E25 100%)',
              padding: '28px 24px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: '#fff',
                border: '2px solid rgba(255,255,255,0.4)',
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{form.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>{form.email}</div>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div className="profile-form-grid">
                <InputField label="Full Name" keyName="name" />
                <InputField label="Email" keyName="email" type="email" />
                <InputField label="Phone" keyName="phone" type="tel" />
                <InputField label="City" keyName="city" />
                <InputField label="Address" keyName="address" />
                <InputField label="Street" keyName="street" />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={() => pushToast('Profile saved')}
                  style={{
                    height: 42,
                    borderRadius: 20,
                    background: 'linear-gradient(90deg, #E5C060, #C99E25, #8E6B1D)',
                    color: '#000',
                    border: 'none',
                    padding: '0 28px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: 0.5,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(201,158,37,0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setForm({ name: 'Bhavesh K', email: 'bhavesh@example.com', phone: '+91 98200 12345' })}
                  style={{
                    height: 42,
                    borderRadius: 20,
                    background: 'none',
                    color: '#888',
                    border: '1.5px solid #ddd',
                    padding: '0 24px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C99E25'; e.currentTarget.style.color = '#C99E25'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#888'; }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Right: Quick Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quickLinks.map((link, idx) => {
              const IconComp = Icon[link.icon];
              return (
                <button
                  key={idx}
                  onClick={() => navigate(link.to)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px',
                    background: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; ev.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; ev.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: '#FDF6E3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <IconComp width={18} height={18} style={{ color: '#C99E25' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>{link.label}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{link.desc}</div>
                  </div>
                  <Icon.ChevronRight width={14} height={14} style={{ color: '#ccc', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .profile-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr;
          align-items: start;
        }
        .profile-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 640px) {
          .profile-form-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr 300px;
          }
        }
      `}</style>
    </div>
  );
}
