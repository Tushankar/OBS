import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { RequireAuth } from './components/guards/RequireAuth';

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
      
      <Routes>
        <Route path="/t/:status" element={<Validate />} />
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
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/success" element={<Success />} />
                  <Route path="/account/tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
                  <Route path="/account/tickets/:id" element={<RequireAuth><TicketDetail /></RequireAuth>} />
                  <Route path="/account/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                  <Route path="/account" element={<RequireAuth><Profile /></RequireAuth>} />

                  {/* Account chapters route */}
                  <Route path="/account/chapters" element={<RequireAuth><MyChapters /></RequireAuth>} />
                  
                  <Route path="/chapters" element={<Chapters />} />
                  <Route path="/chapters/:slug" element={<ChapterDetail />} />
                  <Route path="/organizers/:slug" element={<Organizer />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/careers" element={<Careers />} />
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
