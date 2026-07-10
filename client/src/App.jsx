import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AuthModal from './components/layout/AuthModal';
import Toasts from './components/common/Toasts';

// Global loaders
import AppLoader from './components/common/AppLoader';
import RouteProgress from './components/common/RouteProgress';

// Existing pages
import Home from './pages/Home';
import EventsListing from './pages/EventsListing';
import EventDetail from './pages/EventDetail';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import MyTickets from './pages/MyTickets';
import TicketDetail from './pages/TicketDetail';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Chapters from './pages/Chapters';
import ChapterDetail from './pages/ChapterDetail';
import Organizer from './pages/Organizer';
import SearchResults from './pages/SearchResults';
import Validate from './pages/Validate';
import About from './pages/About';
import Careers from './pages/Careers';
import ListYourEvent from './pages/ListYourEvent';
import Faqs from './pages/Faqs';
import RefundPolicy from './pages/RefundPolicy';
import Help from './pages/Help';
import Webinars from './pages/Webinars';
import Summits from './pages/Summits';
import NotFound from './pages/NotFound';

// New pages
import ProgramOverview from './pages/public/ProgramOverview';
import ProgramDay from './pages/public/ProgramDay';
import SpeakersDirectory from './pages/public/SpeakersDirectory';
import SpeakerProfile from './pages/public/SpeakerProfile';
import SponsorsShowcase from './pages/public/SponsorsShowcase';
import BecomeSponsor from './pages/public/BecomeSponsor';
import NewsListing from './pages/public/NewsListing';
import NewsDetail from './pages/public/NewsDetail';
import Launches from './pages/public/Launches';
import CreateChapter from './pages/public/CreateChapter';
import MyChapters from './pages/account/MyChapters';

import { useApp } from './context/AppContext';
import { RequireAuth, RequireRole } from './components/guards/RequireAuth';

// Organizer + admin portals (Phase 1)
import Apply from './pages/organizer/Apply';
import OrganizerLayout from './components/portal/OrganizerLayout';
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerEvents from './pages/organizer/Events';
import EventWizard from './pages/organizer/EventWizard';
import OrganizerRegistrations from './pages/organizer/Registrations';
import OrganizerCheckIn from './pages/organizer/CheckIn';
import AdminLayout from './components/portal/AdminLayout';
import AdminOrganizers from './pages/admin/Organizers';
import AdminEvents from './pages/admin/Events';
import AdminRefunds from './pages/admin/Refunds';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminTransactions from './pages/admin/Transactions';
import AdminCategories from './pages/admin/Categories';
import AdminChapters from './pages/admin/Chapters';
import AdminCms from './pages/admin/Cms';
import AdminReports from './pages/admin/Reports';
import AdminHero from './pages/admin/Hero';
import CmsPublicPage from './pages/CmsPublicPage';

export default function App() {
  const { authOpen, setAuthOpen } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initial app load simulation (branded AppLoader fades out after 700ms)
    const t = setTimeout(() => setReady(true), 750);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <AppLoader ready={ready} />
      <RouteProgress />
      <Toasts />

      <Routes>
        <Route path="/t/:token" element={<Validate />} />

        {/* Organizer portal — standalone chrome (no public navbar/footer) */}
        <Route element={<RequireAuth><OrganizerLayout /></RequireAuth>}>
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/organizer/events" element={<OrganizerEvents />} />
          <Route path="/organizer/events/new" element={<EventWizard />} />
          <Route path="/organizer/events/:id/edit" element={<EventWizard />} />
          <Route path="/organizer/events/:id/registrations" element={<OrganizerRegistrations />} />
          <Route path="/organizer/events/:id/checkin" element={<OrganizerCheckIn />} />
        </Route>

        {/* Admin panel — standalone chrome (no public navbar/footer) */}
        <Route element={<RequireRole roles={['ADMIN']}><AdminLayout /></RequireRole>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/organizers" element={<AdminOrganizers />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/refunds" element={<AdminRefunds />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/chapters" element={<AdminChapters />} />
          <Route path="/admin/cms" element={<AdminCms />} />
          <Route path="/admin/hero" element={<AdminHero />} />
          <Route path="/admin/reports" element={<AdminReports />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="flex min-h-screen flex-col">
              <Header onOpenAuth={() => setAuthOpen(true)} />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<EventsListing />} />
                  <Route path="/event/:slug" element={<EventDetail />} />
                  <Route path="/checkout/:orderId" element={<RequireAuth><Checkout /></RequireAuth>} />
                  <Route path="/checkout/:orderId/success" element={<RequireAuth><Success /></RequireAuth>} />
                  <Route path="/account/tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
                  <Route path="/account/tickets/:id" element={<RequireAuth><TicketDetail /></RequireAuth>} />
                  <Route path="/account/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                  <Route path="/account" element={<RequireAuth><Profile /></RequireAuth>} />

                  {/* Account chapters route */}
                  <Route path="/account/chapters" element={<RequireAuth><MyChapters /></RequireAuth>} />

                  {/* Organizer self-service application (public chrome; the gated
                      organizer workspace has its own standalone shell above) */}
                  <Route path="/organizer/apply" element={<RequireAuth><Apply /></RequireAuth>} />

                  <Route path="/chapters" element={<Chapters />} />
                  <Route path="/chapters/:slug" element={<ChapterDetail />} />
                  <Route path="/organizers/:slug" element={<Organizer />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/careers" element={<Careers />} />
                  {/* Admin-managed CMS pages (public render) */}
                  <Route path="/terms" element={<CmsPublicPage slug="terms" />} />
                  <Route path="/privacy" element={<CmsPublicPage slug="privacy" />} />
                  <Route path="/pages/:slug" element={<CmsPublicPage />} />
                  <Route path="/list-your-event" element={<ListYourEvent />} />
                  <Route path="/faqs" element={<Faqs />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/webinars" element={<Webinars />} />
                  <Route path="/summits" element={<Summits />} />
                  
                  {/* New Public Sections Routes */}
                  <Route path="/program" element={<ProgramOverview />} />
                  <Route path="/program/day/:n" element={<ProgramDay />} />
                  <Route path="/speakers" element={<SpeakersDirectory />} />
                  <Route path="/speakers/:slug" element={<SpeakerProfile />} />
                  <Route path="/sponsors" element={<SponsorsShowcase />} />
                  <Route path="/become-a-sponsor" element={<BecomeSponsor />} />
                  <Route path="/news" element={<NewsListing />} />
                  <Route path="/news/:slug" element={<NewsDetail />} />
                  <Route path="/launches" element={<Launches />} />
                  <Route path="/chapters/create" element={<CreateChapter />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
            </div>
          }
        />
      </Routes>
    </>
  );
}
