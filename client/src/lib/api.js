import axios from 'axios';

// Axios client for the OBS API. The access token lives in memory only (never
// localStorage); the refresh token is an httpOnly cookie the browser sends
// automatically because withCredentials is true. On a 401 we transparently
// hit /auth/refresh once, then retry the original request (silent refresh).

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

let accessToken = null;
let onLogout = null;

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setOnLogout = (fn) => { onLogout = fn; };

// Endpoints where a 401 is a real answer (bad creds / no session), not an
// expired access token — so we must NOT try to refresh-and-retry them.
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/google', '/auth/logout'];

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh. The server rotates the refresh token on every use and
// treats a reused (already-rotated) token as theft — revoking the WHOLE family
// and logging the user out. So two concurrent /auth/refresh calls with the same
// cookie are catastrophic. EVERY refresh — the boot session-restore AND every
// interceptor retry — must funnel through this one in-flight promise so only a
// single rotation is ever in flight. Sets the new access token on success.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = api
      .post('/auth/refresh')
      .then((res) => { setAccessToken(res.data.accessToken); return res.data; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = !original || original._retry || NO_REFRESH.some((p) => (original.url || '').includes(p));

    if (status === 401 && !skip) {
      original._retry = true;
      try {
        const data = await refreshSession();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        setAccessToken(null);
        if (onLogout) onLogout();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// Normalize the API's typed error shape { error: { code, message } } → Error.
export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

// Expose the typed error CODE (e.g. 'APPLICATION_PENDING') for branching.
export function apiErrorCode(err) {
  return err?.response?.data?.error?.code || null;
}

// ---------------------------------------------------------------------------
// Domain API methods. Portal pages call these (e.g. api.applyOrganizer(...))
// and receive the unwrapped payload, not the axios response. Added per task.
// ---------------------------------------------------------------------------
const unwrap = (p) => p.then((r) => r.data);

// Organizer self-service (Phase 1.1)
api.applyOrganizer = (body) => unwrap(api.post('/organizer/apply', body)).then((d) => d.organizer);
api.myOrganizerProfile = () => unwrap(api.get('/organizer/me')).then((d) => d.organizer);
api.updateOrganizerProfile = (body) => unwrap(api.patch('/organizer/me', body)).then((d) => d.organizer);

// Admin — organizers (Phase 1.1)
api.adminOrganizers = (params) => unwrap(api.get('/admin/organizers', { params })).then((d) => d.organizers);
api.approveOrganizer = (id) => unwrap(api.post(`/admin/organizers/${id}/approve`)).then((d) => d.organizer);
api.rejectOrganizer = (id, reason) =>
  unwrap(api.post(`/admin/organizers/${id}/reject`, { reason })).then((d) => d.organizer);

// Public catalog reference data (Phase 1.3 — used by the wizard + browse)
// Multi-image upload (JPG/PNG/WEBP/GIF ≤5MB, max 8) → { urls: [absoluteUrl] }
api.uploadImages = (files) => {
  const fd = new FormData();
  for (const f of files) fd.append('images', f);
  return unwrap(api.post('/uploads/images', fd)).then((d) => d.urls); // axios sets the multipart boundary itself
};

api.categories = () => unwrap(api.get('/categories')).then((d) => d.categories);
api.chapters = (params) => unwrap(api.get('/chapters', { params })).then((d) => d.chapters);
api.geocode = (address) => unwrap(api.post('/geo/geocode', { address }));
api.reverseGeocode = (lat, lng) => unwrap(api.post('/geo/reverse-geocode', { lat, lng })); // pin → address

// Public event catalog (Phase 1.5) → { events, total, page, limit, pages }
api.listEvents = (params) => unwrap(api.get('/events', { params }));

// Public detail pages (Phase 1.6)
api.event = (slug) => unwrap(api.get(`/events/${slug}`)).then((d) => d.event);
api.eventSimilar = (slug) => unwrap(api.get(`/events/${slug}/similar`)).then((d) => d.events);
api.organizerProfile = (slug) => unwrap(api.get(`/organizers/${slug}`));
api.organizers = () => unwrap(api.get('/organizers')).then((d) => d.organizers);

// Platform-wide public stats (home page credibility numbers — real, never hardcoded)
api.stats = () => unwrap(api.get('/stats')).then((d) => d.stats);

// Account recovery — both endpoints existed server-side; these are the client half.
api.forgotPassword = (email) => unwrap(api.post('/auth/forgot-password', { email }));
api.resetPassword = (token, password) => unwrap(api.post('/auth/reset-password', { token, password }));

// Account self-service.
api.updateMe = (body) => unwrap(api.patch('/auth/me', body)).then((d) => d.user);
api.changePassword = (currentPassword, newPassword) => unwrap(api.post('/auth/change-password', { currentPassword, newPassword }));
api.unsubscribeMarketing = (token) => unwrap(api.post('/marketing/unsubscribe', { token }));
api.verifyEmail = (token) => unwrap(api.post('/auth/verify-email', { token }));
api.verifyOtp = (code) => unwrap(api.post('/auth/verify-otp', { code })); // { ok, user }
api.resendVerification = () => unwrap(api.post('/auth/resend-verification'));
api.chapter = (slug) => unwrap(api.get(`/chapters/${slug}`));
api.joinChapter = (id) => unwrap(api.post(`/chapters/${id}/join`));
api.leaveChapter = (id) => unwrap(api.delete(`/chapters/${id}/join`));

// Open chapter creation (Phase 5.1) — distinct from the admin CRUD methods
// (api.createChapter/updateChapter → /admin/chapters). These hit the public
// user-facing endpoints.
api.createMyChapter = (body) => unwrap(api.post('/chapters', body)).then((d) => d.chapter);
api.updateMyChapter = (id, body) => unwrap(api.patch(`/chapters/${id}`, body)).then((d) => d.chapter);
api.myChapters = () => unwrap(api.get('/chapters/mine')); // { created, joined }
api.myChapterFeed = () => unwrap(api.get('/chapters/mine/feed')); // { events, chapterCount } — member perk feed
api.adminChapterMembers = (id, params) => unwrap(api.get(`/admin/chapters/${id}/members`, { params })); // { chapter, members, total, ... }

// Organizer events (Phase 1.2/1.3)
api.organizerEvents = (params) => unwrap(api.get('/organizer/events', { params }));
api.organizerEvent = (id) => unwrap(api.get(`/organizer/events/${id}`)).then((d) => d.event);
api.organizerCreateEvent = (body) => unwrap(api.post('/organizer/events', body)).then((d) => d.event);
api.organizerUpdateEvent = (id, body) => unwrap(api.patch(`/organizer/events/${id}`, body)).then((d) => d.event);
api.organizerDeleteEvent = (id) => unwrap(api.delete(`/organizer/events/${id}`));
api.organizerBannerPresign = (id, contentType) =>
  unwrap(api.post(`/organizer/events/${id}/banner`, { contentType }));
api.organizerSubmitEvent = (id) => unwrap(api.post(`/organizer/events/${id}/submit`)).then((d) => d.event);
// Cancel a live event: voids tickets, auto-refunds paid orders, emails attendees.
api.organizerCancelEvent = (id, reason) => unwrap(api.post(`/organizer/events/${id}/cancel`, { reason }));
api.adminCancelEvent = (id, reason) => unwrap(api.post(`/admin/events/${id}/cancel`, { reason }));
api.organizerDashboard = () => unwrap(api.get('/organizer/dashboard'));
api.organizerRegistrations = (eventId, params) => unwrap(api.get(`/organizer/events/${eventId}/registrations`, { params }));
api.registrationsExportBlob = (eventId) => api.get(`/organizer/events/${eventId}/registrations/export`, { responseType: 'blob' }).then((r) => r.data);
api.checkin = (body) => unwrap(api.post('/organizer/checkin', body));
api.checkinStats = (eventId) => unwrap(api.get(`/organizer/events/${eventId}/checkin-stats`));
api.requestRefund = (orderId, reason) => unwrap(api.post(`/orders/${orderId}/refund-request`, { reason })).then((d) => d.refund);
api.adminRefunds = (params) => unwrap(api.get('/admin/refunds', { params })).then((d) => d.refunds);
api.approveRefund = (id) => unwrap(api.post(`/admin/refunds/${id}/approve`)).then((d) => d.refund);
api.rejectRefund = (id, notes) => unwrap(api.post(`/admin/refunds/${id}/reject`, { notes })).then((d) => d.refund);

// Ticket types + promo codes CRUD (Phase 2.1) — nested under an owned event.
api.eventTicketTypes = (eventId) => unwrap(api.get(`/organizer/events/${eventId}/ticket-types`)).then((d) => d.ticketTypes);
api.createTicketType = (eventId, body) => unwrap(api.post(`/organizer/events/${eventId}/ticket-types`, body)).then((d) => d.ticketType);
api.updateTicketType = (eventId, id, body) => unwrap(api.patch(`/organizer/events/${eventId}/ticket-types/${id}`, body)).then((d) => d.ticketType);
api.deleteTicketType = (eventId, id) => unwrap(api.delete(`/organizer/events/${eventId}/ticket-types/${id}`));
// Organizer-submitted event sponsors (created PENDING → admin approves).
api.eventSponsorsOrg = (eventId) => unwrap(api.get(`/organizer/events/${eventId}/sponsors`)).then((d) => d.sponsors);
api.createEventSponsor = (eventId, body) => unwrap(api.post(`/organizer/events/${eventId}/sponsors`, body)).then((d) => d.sponsor);
api.updateEventSponsor = (eventId, id, body) => unwrap(api.patch(`/organizer/events/${eventId}/sponsors/${id}`, body)).then((d) => d.sponsor);
api.deleteEventSponsor = (eventId, id) => unwrap(api.delete(`/organizer/events/${eventId}/sponsors/${id}`));

api.eventPromoCodes = (eventId) => unwrap(api.get(`/organizer/events/${eventId}/promo-codes`)).then((d) => d.promoCodes);
api.createPromoCode = (eventId, body) => unwrap(api.post(`/organizer/events/${eventId}/promo-codes`, body)).then((d) => d.promoCode);
api.updatePromoCode = (eventId, id, body) => unwrap(api.patch(`/organizer/events/${eventId}/promo-codes/${id}`, body)).then((d) => d.promoCode);
api.deletePromoCode = (eventId, id) => unwrap(api.delete(`/organizer/events/${eventId}/promo-codes/${id}`));

// Admin — platform-wide promo campaigns (apply across every event).
api.adminPromos = () => unwrap(api.get('/admin/promos')).then((d) => d.promoCodes);
api.createPromo = (body) => unwrap(api.post('/admin/promos', body)).then((d) => d.promoCode);
api.updatePromo = (id, body) => unwrap(api.patch(`/admin/promos/${id}`, body)).then((d) => d.promoCode);
api.deletePromo = (id) => unwrap(api.delete(`/admin/promos/${id}`));

// Checkout, orders & payments (Phase 2)
api.createOrder = (body) => unwrap(api.post('/orders', body)).then((d) => d.order);
api.cancelOrder = (id) => unwrap(api.post(`/orders/${id}/cancel`)).then((d) => d.order);
// Cancel a FREE registration (PAID order with totalAmount 0): voids tickets and
// releases inventory — paid orders go through the refund flow instead.
api.cancelRegistration = (id) => unwrap(api.post(`/orders/${id}/cancel-registration`)).then((d) => d.order);
api.myOrders = (params) => unwrap(api.get('/me/orders', { params }));
api.myOrder = (id) => unwrap(api.get(`/me/orders/${id}`)).then((d) => d.order);
api.invoiceUrl = (id) => unwrap(api.get(`/me/orders/${id}/invoice`)); // { url } — short-lived signed GET
api.stripeIntent = (orderId) => unwrap(api.post('/payments/stripe/intent', { orderId }));
// Confirm payment on return from Stripe — fulfils without waiting on a webhook.
api.stripeVerify = (orderId) => unwrap(api.post('/payments/stripe/verify', { orderId }));
api.myTickets = (scope) => unwrap(api.get('/me/tickets', { params: scope ? { scope } : {} })).then((d) => d.tickets);
api.myTicket = (id) => unwrap(api.get(`/me/tickets/${id}`)).then((d) => d.ticket);
api.ticketPdfBlob = (id) => api.get(`/me/tickets/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data);
api.validateTicket = (token) => unwrap(api.get(`/tickets/validate/${token}`)).then((d) => d.ticket);

// Admin — event moderation (Phase 1.4) + feature toggle (3.5)
api.adminEvents = (params) => unwrap(api.get('/admin/events', { params }));
api.approveEvent = (id) => unwrap(api.post(`/admin/events/${id}/approve`)).then((d) => d.event);
api.rejectEvent = (id, reason) => unwrap(api.post(`/admin/events/${id}/reject`, { reason })).then((d) => d.event);
api.featureEvent = (id, isFeatured) => unwrap(api.patch(`/admin/events/${id}`, { isFeatured })).then((d) => d.event);
api.setEventOwnership = (id, ownership) => unwrap(api.patch(`/admin/events/${id}`, { ownership })).then((d) => d.event);
// Admin-created OBS platform events (create/publish directly, no organizer submit).
api.adminCreateEvent = (body) => unwrap(api.post('/admin/events', body)).then((d) => d.event);
api.adminUpdateEvent = (id, body) => unwrap(api.patch(`/admin/events/${id}`, body)).then((d) => d.event);
api.adminEvent = (id) => unwrap(api.get(`/admin/events/${id}`)).then((d) => d.event); // full detail for editing
// Admin ticket-type CRUD — OBS platform events have no organizer session, so
// their tickets are managed here.
api.adminEventTicketTypes = (eventId) => unwrap(api.get(`/admin/events/${eventId}/ticket-types`)).then((d) => d.ticketTypes);
api.adminCreateTicketType = (eventId, body) => unwrap(api.post(`/admin/events/${eventId}/ticket-types`, body)).then((d) => d.ticketType);
api.adminUpdateTicketType = (eventId, id, body) => unwrap(api.patch(`/admin/events/${eventId}/ticket-types/${id}`, body)).then((d) => d.ticketType);
api.adminDeleteTicketType = (eventId, id) => unwrap(api.delete(`/admin/events/${eventId}/ticket-types/${id}`));
api.adminEventPromoCodes = (eventId) => unwrap(api.get(`/admin/events/${eventId}/promo-codes`)).then((d) => d.promoCodes);
api.adminCreateEventPromo = (eventId, body) => unwrap(api.post(`/admin/events/${eventId}/promo-codes`, body)).then((d) => d.promoCode);
api.adminUpdateEventPromo = (eventId, id, body) => unwrap(api.patch(`/admin/events/${eventId}/promo-codes/${id}`, body)).then((d) => d.promoCode);
api.adminDeleteEventPromo = (eventId, id) => unwrap(api.delete(`/admin/events/${eventId}/promo-codes/${id}`));
// Admin — per-event attendee register + one-to-one email push
api.adminEventTickets = (eventId, params) => unwrap(api.get(`/admin/events/${eventId}/tickets`, { params }));
api.adminEventEmailTemplates = (eventId) => unwrap(api.get(`/admin/events/${eventId}/tickets/email-templates`)).then((d) => d.templates);
api.adminEmailAttendee = (eventId, ticketId, body) => unwrap(api.post(`/admin/events/${eventId}/tickets/${ticketId}/email`, body));
api.launches = (scope) => unwrap(api.get('/launches', { params: scope ? { scope } : {} })).then((d) => d.events);

// Admin — dashboard, users, transactions (Phase 3.5)
api.adminDashboard = (params) => unwrap(api.get('/admin/dashboard', { params }));
api.adminUsers = (params) => unwrap(api.get('/admin/users', { params }));
api.updateUser = (id, body) => unwrap(api.patch(`/admin/users/${id}`, body)).then((d) => d.user);
api.adminTransactions = (params) => unwrap(api.get('/admin/transactions', { params }));

// Email delivery log — every transactional mail + campaign send, with status.
api.adminEmails = (params) => unwrap(api.get('/admin/emails', { params }));
api.organizerEmails = (params) => unwrap(api.get('/organizer/emails', { params }));

// Admin activity (audit) trail + per-user drill-down.
api.adminAudit = (params) => unwrap(api.get('/admin/audit', { params }));
api.adminUser = (id) => unwrap(api.get(`/admin/users/${id}`)); // { user, organizer, stats, orders }

// Organizer settlement statement (per-event ticket revenue / refunds / net).
api.organizerPayouts = () => unwrap(api.get('/organizer/payouts'));

// Admin email campaigns (announcement blasts / new-event launches).
api.adminCampaigns = () => unwrap(api.get('/admin/campaigns')).then((d) => d.campaigns);
api.createCampaign = (body) => unwrap(api.post('/admin/campaigns', body)).then((d) => d.campaign);
api.updateCampaign = (id, body) => unwrap(api.patch(`/admin/campaigns/${id}`, body)).then((d) => d.campaign);
api.deleteCampaign = (id) => unwrap(api.delete(`/admin/campaigns/${id}`));
api.sendCampaign = (id) => unwrap(api.post(`/admin/campaigns/${id}/send`)).then((d) => d.campaign);

// Admin — categories / chapters / CMS CRUD (Phase 3.5)
api.adminCategories = () => unwrap(api.get('/admin/categories')).then((d) => d.categories);
api.createCategory = (body) => unwrap(api.post('/admin/categories', body)).then((d) => d.category);
api.updateCategory = (id, body) => unwrap(api.patch(`/admin/categories/${id}`, body)).then((d) => d.category);
api.deleteCategory = (id) => unwrap(api.delete(`/admin/categories/${id}`));
api.adminChapters = () => unwrap(api.get('/admin/chapters')).then((d) => d.chapters);
api.createChapter = (body) => unwrap(api.post('/admin/chapters', body)).then((d) => d.chapter);
api.updateChapter = (id, body) => unwrap(api.patch(`/admin/chapters/${id}`, body)).then((d) => d.chapter);
api.setChapterStatus = (id, status) => unwrap(api.patch(`/admin/chapters/${id}/status`, { status })).then((d) => d.chapter);
api.deleteChapter = (id) => unwrap(api.delete(`/admin/chapters/${id}`));
api.adminCmsPages = () => unwrap(api.get('/admin/cms')).then((d) => d.pages);
api.createCmsPage = (body) => unwrap(api.post('/admin/cms', body)).then((d) => d.page);
api.updateCmsPage = (id, body) => unwrap(api.patch(`/admin/cms/${id}`, body)).then((d) => d.page);
api.deleteCmsPage = (id) => unwrap(api.delete(`/admin/cms/${id}`));

// Public CMS render (Phase 3.5)
api.publicPage = (slug) => unwrap(api.get(`/pages/${slug}`)).then((d) => d.page);

// Hero carousel (admin-managed site content)
api.heroSlides = () => unwrap(api.get('/hero-slides')).then((d) => d.slides);
api.adminHeroSlides = () => unwrap(api.get('/admin/hero-slides')).then((d) => d.slides);
api.createHeroSlide = (body) => unwrap(api.post('/admin/hero-slides', body)).then((d) => d.slide);
api.updateHeroSlide = (id, body) => unwrap(api.patch(`/admin/hero-slides/${id}`, body)).then((d) => d.slide);
api.deleteHeroSlide = (id) => unwrap(api.delete(`/admin/hero-slides/${id}`));

// Speakers (Phase 5.2)
api.speakers = (params) => unwrap(api.get('/speakers', { params })).then((d) => d.speakers);
api.speakersWithMeta = (params) => unwrap(api.get('/speakers', { params })); // { speakers, topics }
api.speaker = (slug) => unwrap(api.get(`/speakers/${slug}`)); // { speaker, upcoming, past }
api.adminSpeakers = () => unwrap(api.get('/admin/speakers')).then((d) => d.speakers);

// Organizer speaker library — the organizer's own speakers (separate from the
// platform directory) — and reusable sponsor library.
api.organizerSpeakers = () => unwrap(api.get('/organizer/speakers')).then((d) => d.speakers);
api.organizerCreateSpeaker = (body) => unwrap(api.post('/organizer/speakers', body)).then((d) => d.speaker);
api.organizerUpdateSpeaker = (id, body) => unwrap(api.patch(`/organizer/speakers/${id}`, body)).then((d) => d.speaker);
api.organizerDeleteSpeaker = (id) => unwrap(api.delete(`/organizer/speakers/${id}`));
api.organizerSponsors = () => unwrap(api.get('/organizer/sponsors')).then((d) => d.sponsors);
api.organizerCreateSponsor = (body) => unwrap(api.post('/organizer/sponsors', body)).then((d) => d.sponsor);
api.organizerUpdateSponsor = (id, body) => unwrap(api.patch(`/organizer/sponsors/${id}`, body)).then((d) => d.sponsor);
api.organizerDeleteSponsor = (id) => unwrap(api.delete(`/organizer/sponsors/${id}`));
api.createSpeaker = (body) => unwrap(api.post('/admin/speakers', body)).then((d) => d.speaker);
api.updateSpeaker = (id, body) => unwrap(api.patch(`/admin/speakers/${id}`, body)).then((d) => d.speaker);
api.deleteSpeaker = (id) => unwrap(api.delete(`/admin/speakers/${id}`));

// Sponsors & partners (Phase 5.3)
api.sponsors = (params) => unwrap(api.get('/sponsors', { params })).then((d) => d.sponsors);
api.sponsor = (slug) => unwrap(api.get(`/sponsors/${slug}`)); // { sponsor, events }
api.eventSponsors = (slug) => unwrap(api.get(`/events/${slug}/sponsors`)).then((d) => d.sponsors);
api.submitPartnerApplication = (body) => unwrap(api.post('/partner-applications', body)).then((d) => d.application);
api.adminSponsors = () => unwrap(api.get('/admin/sponsors')).then((d) => d.sponsors);
api.createSponsor = (body) => unwrap(api.post('/admin/sponsors', body)).then((d) => d.sponsor);
api.updateSponsor = (id, body) => unwrap(api.patch(`/admin/sponsors/${id}`, body)).then((d) => d.sponsor);
api.deleteSponsor = (id) => unwrap(api.delete(`/admin/sponsors/${id}`));
api.adminPartnerApplications = (params) => unwrap(api.get('/admin/partner-applications', { params })).then((d) => d.applications);
api.updatePartnerApplication = (id, body) => unwrap(api.patch(`/admin/partner-applications/${id}`, body)).then((d) => d.application);

// Support tickets — public report-an-issue form + admin inbox
api.submitSupportTicket = (body) => unwrap(api.post('/support-tickets', body)).then((d) => d.ticket);
api.adminSupportTickets = (params) => unwrap(api.get('/admin/support-tickets', { params })); // { tickets, total }
api.updateSupportTicket = (id, body) => unwrap(api.patch(`/admin/support-tickets/${id}`, body)).then((d) => d.ticket);

// Loyalty — top bookers + promo grants (admin) and the user's own codes
api.adminTopBookers = (params) => unwrap(api.get('/admin/loyalty/top-bookers', { params })).then((d) => d.bookers);
api.adminSendPromo = (body) => unwrap(api.post('/admin/loyalty/send-promo', body)); // { granted, sent }
api.myPromoCodes = () => unwrap(api.get('/me/promo-codes')).then((d) => d.promos);

// Admin notifications — header bell (polled)
api.adminNotifications = (params) => unwrap(api.get('/admin/notifications', { params })); // { notifications, unread }
api.readNotification = (id) => unwrap(api.post(`/admin/notifications/${id}/read`));
api.readAllNotifications = () => unwrap(api.post('/admin/notifications/read-all'));

// Articles / media (Phase 5.4)
api.articles = (params) => unwrap(api.get('/articles', { params })).then((d) => d.articles);
api.articlesPaged = (params) => unwrap(api.get('/articles', { params })); // { articles, total, page, limit, pages }
api.article = (slug) => unwrap(api.get(`/articles/${slug}`)).then((d) => d.article);
api.adminArticles = () => unwrap(api.get('/admin/articles')).then((d) => d.articles);
api.createArticle = (body) => unwrap(api.post('/admin/articles', body)).then((d) => d.article);
api.updateArticle = (id, body) => unwrap(api.patch(`/admin/articles/${id}`, body)).then((d) => d.article);
api.deleteArticle = (id) => unwrap(api.delete(`/admin/articles/${id}`));

// 100 Days Program (Phase 5.5)
api.currentProgram = () => unwrap(api.get('/programs/current')).then((d) => d.program);
api.program = (slug) => unwrap(api.get(`/programs/${slug}`)); // { program, days }
api.programDay = (slug, n, params) => unwrap(api.get(`/programs/${slug}/days/${n}`, { params })); // { program, day, events }
api.adminPrograms = () => unwrap(api.get('/admin/programs')).then((d) => d.programs);
api.createProgram = (body) => unwrap(api.post('/admin/programs', body)).then((d) => d.program);
api.updateProgram = (id, body) => unwrap(api.patch(`/admin/programs/${id}`, body)).then((d) => d.program);
api.deleteProgram = (id) => unwrap(api.delete(`/admin/programs/${id}`));
api.programDaysAdmin = (id) => unwrap(api.get(`/admin/programs/${id}/days`)).then((d) => d.days);
api.updateProgramDay = (id, n, body) => unwrap(api.patch(`/admin/programs/${id}/days/${n}`, body)).then((d) => d.day);

// Admin — reports (Phase 4.1)
api.reportsSummary = () => unwrap(api.get('/admin/reports/summary')).then((d) => d.summary);
api.reportsMonthly = (year) => unwrap(api.get('/admin/reports/monthly', { params: year ? { year } : {} })).then((d) => d.monthly);
api.reportsByEvent = (limit) => unwrap(api.get('/admin/reports/by-event', { params: limit ? { limit } : {} })).then((d) => d.byEvent);
api.reportsTopEvents = (limit) => unwrap(api.get('/admin/reports/top-events', { params: limit ? { limit } : {} })).then((d) => d.topEvents);

// Raw PUT to a presigned S3 URL. Bypasses the api instance so no Authorization
// header / baseURL is attached (the presigned URL is self-authenticating).
export async function uploadToPresignedUrl(uploadUrl, file) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return true;
}

export default api;
