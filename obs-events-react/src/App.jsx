import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AuthModal from './components/layout/AuthModal';
import Toasts from './components/common/Toasts';

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

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);

  // The gate-scan screen is a standalone full-bleed view (no chrome).
  return (
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
                <Route path="/account/tickets" element={<MyTickets />} />
                <Route path="/account/tickets/:id" element={<TicketDetail />} />
                <Route path="/account/orders" element={<Orders />} />
                <Route path="/account" element={<Profile />} />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
            <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
          </div>
        }
      />
    </Routes>
  );
}
