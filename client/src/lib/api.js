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

let refreshing = null; // shared promise so concurrent 401s trigger one refresh

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = !original || original._retry || NO_REFRESH.some((p) => (original.url || '').includes(p));

    if (status === 401 && !skip) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setAccessToken(data.accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
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

// Admin — organizers (Phase 1.1)
api.adminOrganizers = (params) => unwrap(api.get('/admin/organizers', { params })).then((d) => d.organizers);
api.approveOrganizer = (id) => unwrap(api.post(`/admin/organizers/${id}/approve`)).then((d) => d.organizer);
api.rejectOrganizer = (id, reason) =>
  unwrap(api.post(`/admin/organizers/${id}/reject`, { reason })).then((d) => d.organizer);

// Public catalog reference data (Phase 1.3 — used by the wizard + browse)
api.categories = () => unwrap(api.get('/categories')).then((d) => d.categories);
api.chapters = (params) => unwrap(api.get('/chapters', { params })).then((d) => d.chapters);
api.geocode = (address) => unwrap(api.post('/geo/geocode', { address }));

// Public event catalog (Phase 1.5) → { events, total, page, limit, pages }
api.listEvents = (params) => unwrap(api.get('/events', { params }));

// Public detail pages (Phase 1.6)
api.event = (slug) => unwrap(api.get(`/events/${slug}`)).then((d) => d.event);
api.eventSimilar = (slug) => unwrap(api.get(`/events/${slug}/similar`)).then((d) => d.events);
api.organizerProfile = (slug) => unwrap(api.get(`/organizers/${slug}`));
api.chapter = (slug) => unwrap(api.get(`/chapters/${slug}`));
api.joinChapter = (id) => unwrap(api.post(`/chapters/${id}/join`));
api.leaveChapter = (id) => unwrap(api.delete(`/chapters/${id}/join`));

// Organizer events (Phase 1.2/1.3)
api.organizerEvents = (params) => unwrap(api.get('/organizer/events', { params }));
api.organizerEvent = (id) => unwrap(api.get(`/organizer/events/${id}`)).then((d) => d.event);
api.organizerCreateEvent = (body) => unwrap(api.post('/organizer/events', body)).then((d) => d.event);
api.organizerUpdateEvent = (id, body) => unwrap(api.patch(`/organizer/events/${id}`, body)).then((d) => d.event);
api.organizerDeleteEvent = (id) => unwrap(api.delete(`/organizer/events/${id}`));
api.organizerBannerPresign = (id, contentType) =>
  unwrap(api.post(`/organizer/events/${id}/banner`, { contentType }));
api.organizerSubmitEvent = (id) => unwrap(api.post(`/organizer/events/${id}/submit`)).then((d) => d.event);
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
api.eventPromoCodes = (eventId) => unwrap(api.get(`/organizer/events/${eventId}/promo-codes`)).then((d) => d.promoCodes);
api.createPromoCode = (eventId, body) => unwrap(api.post(`/organizer/events/${eventId}/promo-codes`, body)).then((d) => d.promoCode);
api.updatePromoCode = (eventId, id, body) => unwrap(api.patch(`/organizer/events/${eventId}/promo-codes/${id}`, body)).then((d) => d.promoCode);
api.deletePromoCode = (eventId, id) => unwrap(api.delete(`/organizer/events/${eventId}/promo-codes/${id}`));

// Checkout, orders & payments (Phase 2)
api.createOrder = (body) => unwrap(api.post('/orders', body)).then((d) => d.order);
api.cancelOrder = (id) => unwrap(api.post(`/orders/${id}/cancel`)).then((d) => d.order);
api.myOrders = (params) => unwrap(api.get('/me/orders', { params }));
api.myOrder = (id) => unwrap(api.get(`/me/orders/${id}`)).then((d) => d.order);
api.razorpayCreateOrder = (orderId) => unwrap(api.post('/payments/razorpay/order', { orderId }));
api.razorpayVerify = (body) => unwrap(api.post('/payments/razorpay/verify', body));
api.stripeIntent = (orderId) => unwrap(api.post('/payments/stripe/intent', { orderId }));
api.myTickets = (scope) => unwrap(api.get('/me/tickets', { params: scope ? { scope } : {} })).then((d) => d.tickets);
api.myTicket = (id) => unwrap(api.get(`/me/tickets/${id}`)).then((d) => d.ticket);
api.ticketPdfBlob = (id) => api.get(`/me/tickets/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data);
api.validateTicket = (token) => unwrap(api.get(`/tickets/validate/${token}`)).then((d) => d.ticket);

// Admin — event moderation (Phase 1.4)
api.adminEvents = (params) => unwrap(api.get('/admin/events', { params }));
api.approveEvent = (id) => unwrap(api.post(`/admin/events/${id}/approve`)).then((d) => d.event);
api.rejectEvent = (id, reason) => unwrap(api.post(`/admin/events/${id}/reject`, { reason })).then((d) => d.event);

// Raw PUT to a presigned S3 URL. Bypasses the api instance so no Authorization
// header / baseURL is attached (the presigned URL is self-authenticating).
export async function uploadToPresignedUrl(uploadUrl, file) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return true;
}

export default api;
