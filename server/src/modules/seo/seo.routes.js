import { Router } from 'express';
import { Event, Chapter, OrganizerProfile, CmsPage } from '../../models/index.js';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// SPA SEO (§4.4). Served at the site root (deploy proxies /sitemap.xml and
// /robots.txt from the web origin to the API). URLs point at APP_URL (frontend).
const router = Router();

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const iso = (d) => (d ? new Date(d).toISOString() : undefined);

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}${priority ? `<priority>${priority}</priority>` : ''}</url>`;
}

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const base = env.APP_URL.replace(/\/$/, '');
  const [events, chapters, organizers, pages] = await Promise.all([
    Event.find({ status: 'PUBLISHED' }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(5000),
    Chapter.find({ status: 'APPROVED', isActive: true }).select('slug updatedAt').limit(5000),
    OrganizerProfile.find({ status: 'APPROVED' }).select('slug updatedAt').limit(5000),
    CmsPage.find({ status: 'PUBLISHED' }).select('slug updatedAt').limit(500),
  ]);

  const entries = [
    urlEntry(`${base}/`, undefined, 'daily', '1.0'),
    urlEntry(`${base}/events`, undefined, 'daily', '0.9'),
    urlEntry(`${base}/chapters`, undefined, 'weekly', '0.7'),
    ...events.map((e) => urlEntry(`${base}/event/${e.slug}`, iso(e.updatedAt), 'daily', '0.8')),
    ...chapters.map((c) => urlEntry(`${base}/chapters/${c.slug}`, iso(c.updatedAt), 'weekly', '0.6')),
    ...organizers.map((o) => urlEntry(`${base}/organizers/${o.slug}`, iso(o.updatedAt), 'weekly', '0.5')),
    ...pages.map((p) => urlEntry(`${base}/${p.slug}`, iso(p.updatedAt), 'monthly', '0.4')),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(xml);
}));

router.get('/robots.txt', (req, res) => {
  const base = env.APP_URL.replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /account',
    'Disallow: /admin',
    'Disallow: /organizer',
    'Disallow: /checkout',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(body);
});

export default router;
