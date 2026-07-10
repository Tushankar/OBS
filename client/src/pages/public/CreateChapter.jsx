import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

// Friendly UI type → backend CHAPTER_TYPE enum.
const TYPE_MAP = {
  Country: 'GEO_COUNTRY',
  City: 'GEO_CITY',
  Community: 'LEADERSHIP_COMMUNITY',
  Industry: 'INDUSTRY_PROFESSIONAL',
  Interest: 'STRATEGIC_EXPANSION',
};

export default function CreateChapter() {
  const navigate = useNavigate();
  const { user, setAuthOpen, pushToast } = useApp();
  const [form, setForm] = useState({
    name: '',
    type: 'Community',
    country: 'India',
    description: '',
    coverUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const countries = [
    { name: 'India', code: 'IN', flag: '🇮🇳' },
    { name: 'UAE', code: 'AE', flag: '🇦🇪' },
    { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
    { name: 'USA', code: 'US', flag: '🇺🇸' },
    { name: 'UK', code: 'GB', flag: '🇬🇧' },
    { name: 'Germany', code: 'DE', flag: '🇩🇪' },
    { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷' }
  ];

  const types = ['Country', 'City', 'Community', 'Industry', 'Interest'];

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = 'Chapter name is required';
    if (!form.description.trim()) err.description = 'Short description is required';
    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const err = validate();
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSubmitting(true);
    const isGeo = form.type === 'Country' || form.type === 'City';
    const selectedCountry = countries.find((c) => c.name === form.country);
    try {
      const chapter = await api.createMyChapter({
        name: form.name.trim(),
        type: TYPE_MAP[form.type] || 'LEADERSHIP_COMMUNITY',
        description: form.description.trim(),
        countryCode: isGeo ? selectedCountry?.code : undefined,
        flagEmoji: isGeo ? selectedCountry?.flag : undefined,
        coverUrl: form.coverUrl || undefined,
      });
      pushToast(`Chapter "${chapter.name}" created!`);
      navigate(`/chapters/${chapter.slug}`);
    } catch (e2) {
      pushToast(apiError(e2, 'Failed to create chapter. Try again.'), false);
    } finally {
      setSubmitting(false);
    }
  };

  // Auth Gate Screen
  if (!user) {
    return (
      <div className="min-h-[70vh] bg-[#F5F5F5] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center bg-white border border-line p-8 rounded-xl shadow-sm">
          <span className="text-4xl">🔐</span>
          <h2 className="mt-4 text-xl font-bold text-ink">Sign In Required</h2>
          <p className="mt-2 text-sm text-ink-mute">
            You must be signed in to request or create an OBS community chapter.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-6 w-full rounded-full bg-brand py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-dark transition-colors"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  const selectedCountry = countries.find(c => c.name === form.country);
  const displayFlag = (form.type === 'Country' || form.type === 'City') ? selectedCountry?.flag : '';

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-8">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-ink">Start a Chapter</h1>
          <p className="mt-1 text-sm text-ink-mute">Create a regional, community, or interest-based OBS chapter.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start max-w-4xl mx-auto">
          {/* Form Card */}
          <div className="rounded-xl border border-line bg-white p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Chapter Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. OBS Fintech Pune or OBS SaaS"
                  className={`h-10 w-full rounded-md border bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand ${
                    errors.name ? 'border-[#C99E25]' : 'border-line'
                  }`}
                />
                {errors.name && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.name}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Chapter Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="h-10 w-full rounded-md border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand"
                  >
                    {types.map((t) => (
                      <option key={t} value={t}>{t} Chapter</option>
                    ))}
                  </select>
                </div>

                {(form.type === 'Country' || form.type === 'City') && (
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Country *</label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="h-10 w-full rounded-md border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand"
                    >
                      {countries.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Short Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is the focus of this chapter? E.g. A networking guild for developers in Pune."
                  className={`w-full rounded-md border bg-white p-3 text-sm text-ink outline-none transition focus:border-brand min-h-[100px] ${
                    errors.description ? 'border-[#C99E25]' : 'border-line'
                  }`}
                />
                {errors.description && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.description}</span>}
              </div>

              <div className="text-[10.5px] text-ink-mute leading-relaxed border-t border-line pt-4 mt-2">
                New chapters are reviewed by the OBS operations team and may be marked official later. Live preview represents what it looks like on the directory page.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 h-10 w-full rounded-md bg-[#C99E25] text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#A37E19] disabled:opacity-50 flex items-center justify-center"
              >
                {submitting ? 'Creating Chapter...' : 'Create chapter'}
              </button>
            </form>
          </div>

          {/* Live Preview Column */}
          <aside className="sticky top-[90px]">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-3 px-1">Live Card Preview</h3>
            
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {displayFlag ? (
                  <span className="shrink-0 text-3xl leading-none">{displayFlag}</span>
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-sm font-bold text-brand uppercase">
                    {form.name ? form.name[0] : 'O'}
                  </span>
                )}
                
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">
                    {form.name || 'OBS Chapter Name'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-mute font-medium">
                    {form.type} · Under review
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs text-ink-soft leading-relaxed clamp-3">
                {form.description || 'Provide a description on the left to preview it here.'}
              </p>

              <div className="mt-3 border-t border-neutral-100 pt-2.5 flex items-center justify-between text-[10px] text-ink-mute font-bold">
                <span>Created by You</span>
                <span className="rounded bg-amber-50 border border-amber-200 text-amber-600 px-1 py-0.5 font-bold uppercase text-[8px] leading-none">
                  Draft
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
