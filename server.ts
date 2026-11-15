import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  AppointmentStatus,
  CatalogConfig,
  CustomerReview,
  FittingAppointment,
  ShopDetails,
  TailoringOrder,
} from './src/types.ts';
import {
  DEFAULT_CATALOG,
  computeReviewSummary,
  filterOrders,
  mapBillingHtmlOrders,
  toTrackedOrderResult,
  validateAppointmentInput,
  validateReviewInput,
} from './src/utils/tailoring.ts';
import { serializeCatalogForRtdbServices } from './src/utils/firebaseSyncHelpers.ts';

interface OwnerAccount {
  businessId: string;
  ownerName: string;
  passwordSalt: string;
  passwordHash: string;
}

interface PersistedStore {
  owner: OwnerAccount;
  shopDetails: ShopDetails;
  catalog: CatalogConfig;
  orders: TailoringOrder[];
  appointments: FittingAppointment[];
  reviews: CustomerReview[];
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'deeksha_tailors_rajarhat_session_key_2026';
const COOKIE_NAME = 'deeksha_owner_session';
const FIREBASE_RTDB_URL = 'https://deeksha-ladies-tailors-default-rtdb.firebaseio.com';
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDA7qYT7x85-w4EV6DUCj5B5Iciwj3CZQQ';

async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ localId: string; email?: string; displayName?: string } | null> {
  if (!idToken) return null;
  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!verifyRes.ok) return null;
    const verifyData = (await verifyRes.json()) as {
      users?: Array<{ localId?: string; email?: string; displayName?: string }>;
    };
    const fbUser = verifyData.users?.[0];
    if (!fbUser?.localId) return null;
    return {
      localId: fbUser.localId,
      email: fbUser.email,
      displayName: fbUser.displayName,
    };
  } catch {
    return null;
  }
}

async function mirrorToFirebaseRtdb(
  rtdbPath: string,
  method: 'PUT' | 'DELETE',
  data?: unknown,
  firebaseIdToken?: string,
): Promise<void> {
  try {
    const query = firebaseIdToken ? `?auth=${encodeURIComponent(firebaseIdToken)}` : '';
    const url = `${FIREBASE_RTDB_URL}/${rtdbPath}.json${query}`;
    await fetch(url, {
      method,
      headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'PUT' ? JSON.stringify(data ?? null) : undefined,
    });
  } catch {
    // Best-effort sync; client SDK also writes with authenticated user credentials
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function createSessionToken(businessId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      businessId,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { businessId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      businessId: string;
      exp: number;
    };
    if (!parsed.businessId || parsed.exp < Date.now()) return null;
    return { businessId: parsed.businessId };
  } catch {
    return null;
  }
}

function createSeedStore(): PersistedStore {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    owner: {
      businessId: 'deeksha_owner',
      ownerName: 'Deeksha Boutique Owner',
      passwordSalt: salt,
      passwordHash: hashPassword('Deeksha@2026', salt),
    },
    shopDetails: {
      businessName: 'Deeksha Ladies Tailor & Matching Center',
      tagline: 'Designer Blouses, Salwar Suits, Bridal Lehengas & Matching Fabrics',
      address: '211 Road, Opposite Bazaar Kolkata, Near Rajarhat Thana',
      landmark: 'Opposite Bazaar Kolkata',
      city: 'Rajarhat, Kolkata',
      pincode: '700135',
      phone: '+91 74495 31663',
      whatsappDigits: '917449531663',
      hours: 'Mon – Sun: 10:30 AM – 9:00 PM',
      announcement: 'Express 24-Hour Stitching Available for Urgent Occasions',
      googleBusinessUrl: 'https://share.google/zbgBH15WaKYkn3CG8',
      googleMapsUrl: 'https://maps.app.goo.gl/yMKhwcrZyKzaqVR4A?g_st=ac',
      youtubeUrl: 'https://youtube.com/@deesufashiondesigner?si=NTjEtf-O3dJb6ocE',
      instagramUrl: 'https://www.instagram.com/deesufashion?dlrf=aGRyaWttNWE0NnNy',
      facebookUrl: 'https://www.facebook.com/deesuCollection',
      baseDirectoryRating: 4.8,
      baseDirectoryReviewCount: 35,
    },
    catalog: DEFAULT_CATALOG,
    orders: [],
    appointments: [],
    reviews: [
      {
        id: 'rev-1',
        customerName: 'Srabani Roy',
        rating: 5,
        service: 'Designer Blouse & Matching Astar',
        comment:
          'Accurate shoulder and bust fitting without needing repeated alterations. Having matching cotton astar and falls right at the shop saves so much time in Rajarhat.',
        source: 'Google Business Profile',
        visitDate: 'October 2026',
        visible: true,
        featured: true,
        ownerReply: 'Thank you for trusting us with your festive sarees, Srabani ji.',
        createdAt: '2026-10-24T12:00:00.000Z',
      },
      {
        id: 'rev-2',
        customerName: 'Paramita Bose',
        rating: 5,
        service: 'Bridal Blouse & Saree Finishing',
        comment:
          'Cooperative staff and reliable delivery dates even during Durga Puja rush. My padded Prince cut blouses turned out neat with zero puckering.',
        source: 'Justdial Verified',
        visitDate: 'October 2026',
        visible: true,
        featured: true,
        createdAt: '2026-10-12T15:30:00.000Z',
      },
      {
        id: 'rev-3',
        customerName: 'Nandini Chakraborty',
        rating: 5,
        service: 'Salwar Suit & Alia Cut Kurti',
        comment:
          'Very convenient location right opposite Bazaar Kolkata near Rajarhat Thana. Clean finishing on Pakistani suit mori and palazzo trousers.',
        source: 'Google Business Profile',
        visitDate: 'September 2026',
        visible: true,
        featured: false,
        createdAt: '2026-09-28T11:20:00.000Z',
      },
      {
        id: 'rev-4',
        customerName: 'Tania Mondal',
        rating: 4,
        service: 'Urgent 24-Hour Blouse Stitching',
        comment:
          'Needed an urgent blouse stitched before a wedding in New Town. Delivered on time with matching dori and handmade tassels.',
        source: 'Justdial Verified',
        visitDate: 'September 2026',
        visible: true,
        featured: false,
        createdAt: '2026-09-14T18:10:00.000Z',
      },
    ],
  };
}

function loadStore(): PersistedStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const seeded = createSeedStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as PersistedStore;
  if (!parsed.catalog) {
    parsed.catalog = DEFAULT_CATALOG;
  }
  if (parsed.shopDetails) {
    parsed.shopDetails.youtubeUrl ??= 'https://youtube.com/@deesufashiondesigner?si=NTjEtf-O3dJb6ocE';
    parsed.shopDetails.instagramUrl ??= 'https://www.instagram.com/deesufashion?dlrf=aGRyaWttNWE0NnNy';
    parsed.shopDetails.facebookUrl ??= 'https://www.facebook.com/deesuCollection';
  }
  return parsed;
}

function saveStore(store: PersistedStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const parts = cookieHeader.split(';').map((c) => c.trim());
    for (const part of parts) {
      if (part.startsWith(`${COOKIE_NAME}=`)) {
        return decodeURIComponent(part.slice(COOKIE_NAME.length + 1));
      }
    }
  }
  return null;
}

function extractFirebaseIdToken(req: Request): string | undefined {
  const header = req.headers['x-firebase-id-token'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return undefined;
}

async function requireOwnerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  const store = loadStore();
  if (token) {
    const verified = verifySessionToken(token);
    if (verified && verified.businessId === store.owner.businessId) {
      next();
      return;
    }
  }

  const fbToken = extractFirebaseIdToken(req) || token || '';
  if (fbToken) {
    const fbUser = await verifyFirebaseIdToken(fbToken);
    if (fbUser) {
      next();
      return;
    }
  }

  res.status(401).json({ error: 'Authentication required. Please sign in to the Admin Dashboard.' });
}

async function startServer(): Promise<void> {
  loadStore();
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // --- Public API Routes ---
  app.get('/api/public/bootstrap', (_req, res) => {
    const store = loadStore();
    const visibleReviews = store.reviews.filter((r) => r.visible);
    const reviewSummary = computeReviewSummary(
      store.reviews,
      store.shopDetails.baseDirectoryRating,
      store.shopDetails.baseDirectoryReviewCount,
      store.shopDetails.googleBusinessUrl,
    );
    res.json({
      shopDetails: store.shopDetails,
      catalog: store.catalog,
      reviews: visibleReviews,
      reviewSummary,
    });
  });

  app.get('/api/orders/track', (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Please enter a 10-digit mobile number, Bill No., or customer name.' });
      return;
    }
    const store = loadStore();
    const matches = filterOrders(store.orders, q).map(toTrackedOrderResult);
    res.json({ orders: matches });
  });

  app.post('/api/appointments', (req, res) => {
    const body = req.body as {
      name?: string;
      phone?: string;
      preferredDate?: string;
      timeSlot?: string;
      notes?: string;
    };
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const preferredDate = String(body.preferredDate ?? '').trim() || 'Earliest Available';
    const timeSlot = String(body.timeSlot ?? '').trim() || 'Evening (5:00 PM - 8:30 PM)';
    const notes = String(body.notes ?? '').trim() || 'Stitching consultation';

    const check = validateAppointmentInput({ name, phone, preferredDate, timeSlot });
    if (!check.valid || !check.normalizedPhone) {
      res.status(400).json({ error: check.error || 'Invalid appointment details.' });
      return;
    }

    const store = loadStore();
    const created: FittingAppointment = {
      id: `apt-${Date.now()}`,
      name,
      phone: check.normalizedPhone,
      preferredDate,
      timeSlot,
      notes,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    store.appointments.unshift(created);
    saveStore(store);
    void mirrorToFirebaseRtdb(`appointments/${created.id}`, 'PUT', created);

    res.status(201).json({ appointment: created });
  });

  app.post('/api/reviews', (req, res) => {
    const body = req.body as {
      id?: string;
      customerName?: string;
      rating?: number;
      service?: string;
      comment?: string;
    };
    const requestedId = String(body.id ?? '').trim();
    const safeId = /^[a-zA-Z0-9_-]{4,80}$/.test(requestedId) ? requestedId : `rev-${Date.now()}`;
    const customerName = String(body.customerName ?? '').trim();
    const rating = Number(body.rating);
    const service = String(body.service ?? '').trim();
    const comment = String(body.comment ?? '').trim();

    const check = validateReviewInput({ customerName, rating, service, comment });
    if (!check.valid) {
      res.status(400).json({ error: check.error || 'Invalid review input.' });
      return;
    }

    const store = loadStore();
    const created: CustomerReview = {
      id: safeId,
      customerName,
      rating,
      service,
      comment,
      source: 'Website Customer',
      visitDate: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      visible: true,
      featured: false,
      createdAt: new Date().toISOString(),
    };
    store.reviews = [created, ...store.reviews.filter((r) => r.id !== created.id)];
    saveStore(store);
    void mirrorToFirebaseRtdb(`reviews/${created.id}`, 'PUT', created);

    const reviewSummary = computeReviewSummary(
      store.reviews,
      store.shopDetails.baseDirectoryRating,
      store.shopDetails.baseDirectoryReviewCount,
      store.shopDetails.googleBusinessUrl,
    );
    res.status(201).json({ review: created, reviewSummary });
  });

  // --- Auth API Routes ---
  app.post('/api/auth/login', (req, res) => {
    const body = req.body as { businessId?: string; password?: string };
    const businessId = String(body.businessId ?? '').trim();
    const password = String(body.password ?? '');

    if (!businessId || !password) {
      res.status(400).json({ error: 'Both Business ID and Password are required.' });
      return;
    }

    const store = loadStore();
    const matchesId = businessId.toLowerCase() === store.owner.businessId.toLowerCase();
    const matchesPw = verifyPassword(password, store.owner.passwordSalt, store.owner.passwordHash);

    if (!matchesId || !matchesPw) {
      res.status(401).json({ error: 'Invalid Business ID or Password.' });
      return;
    }

    const token = createSessionToken(store.owner.businessId);
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    );
    res.json({
      token,
      user: {
        businessId: store.owner.businessId,
        ownerName: store.owner.ownerName,
      },
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractToken(req);
    if (!token) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const verified = verifySessionToken(token);
    const store = loadStore();
    if (!verified || verified.businessId !== store.owner.businessId) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({
      authenticated: true,
      user: {
        businessId: store.owner.businessId,
        ownerName: store.owner.ownerName,
      },
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.json({ ok: true });
  });

  app.post('/api/auth/firebase-session', async (req, res) => {
    const body = req.body as { idToken?: string };
    const idToken = String(body.idToken ?? '').trim();
    if (!idToken) {
      res.status(400).json({ error: 'Firebase ID token is required.' });
      return;
    }

    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDA7qYT7x85-w4EV6DUCj5B5Iciwj3CZQQ';
    try {
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        },
      );
      if (!verifyRes.ok) {
        res.status(401).json({ error: 'Invalid Firebase session token.' });
        return;
      }
      const verifyData = (await verifyRes.json()) as {
        users?: Array<{ localId?: string; email?: string; displayName?: string }>;
      };
      const fbUser = verifyData.users?.[0];
      if (!fbUser?.localId) {
        res.status(401).json({ error: 'Firebase user not found.' });
        return;
      }

      const store = loadStore();
      const token = createSessionToken(store.owner.businessId);
      res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      );
      res.json({
        token,
        user: {
          businessId: fbUser.email || fbUser.localId,
          ownerName: fbUser.displayName || 'Deeksha Boutique Admin',
        },
      });
    } catch {
      res.status(502).json({ error: 'Could not verify Firebase session.' });
    }
  });

  app.put('/api/auth/credentials', requireOwnerAuth, (req, res) => {
    const body = req.body as {
      currentPassword?: string;
      newBusinessId?: string;
      newPassword?: string;
      ownerName?: string;
    };
    const currentPassword = String(body.currentPassword ?? '');
    const newBusinessId = String(body.newBusinessId ?? '').trim();
    const newPassword = String(body.newPassword ?? '');
    const ownerName = String(body.ownerName ?? '').trim();

    const store = loadStore();
    if (!verifyPassword(currentPassword, store.owner.passwordSalt, store.owner.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (newBusinessId && newBusinessId.length < 3) {
      res.status(400).json({ error: 'Business ID must be at least 3 characters.' });
      return;
    }
    if (newPassword && newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    if (newBusinessId) store.owner.businessId = newBusinessId;
    if (ownerName) store.owner.ownerName = ownerName;
    if (newPassword) {
      const salt = crypto.randomBytes(16).toString('hex');
      store.owner.passwordSalt = salt;
      store.owner.passwordHash = hashPassword(newPassword, salt);
    }
    saveStore(store);

    const token = createSessionToken(store.owner.businessId);
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    );
    res.json({
      token,
      user: {
        businessId: store.owner.businessId,
        ownerName: store.owner.ownerName,
      },
    });
  });

  // --- Protected Business Owner Portal Routes ---
  app.get('/api/admin/overview', requireOwnerAuth, (_req, res) => {
    const store = loadStore();
    const reviewSummary = computeReviewSummary(
      store.reviews,
      store.shopDetails.baseDirectoryRating,
      store.shopDetails.baseDirectoryReviewCount,
      store.shopDetails.googleBusinessUrl,
    );
    res.json({
      orders: store.orders,
      appointments: store.appointments,
      reviews: store.reviews,
      shopDetails: store.shopDetails,
      catalog: store.catalog,
      reviewSummary,
    });
  });

  app.put('/api/admin/orders/sync', requireOwnerAuth, (req, res) => {
    const body = req.body as { orders?: unknown };
    if (!Array.isArray(body.orders)) {
      res.status(400).json({ error: 'orders array is required.' });
      return;
    }
    const store = loadStore();
    store.orders = mapBillingHtmlOrders(body.orders);
    saveStore(store);
    res.json({ count: store.orders.length });
  });

  app.patch('/api/admin/appointments/:id', requireOwnerAuth, (req, res) => {
    const body = req.body as { status?: AppointmentStatus };
    const store = loadStore();
    const apt = store.appointments.find((a) => a.id === req.params.id);
    if (!apt) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }
    if (body.status) {
      apt.status = body.status;
    }
    saveStore(store);
    void mirrorToFirebaseRtdb(`appointments/${apt.id}`, 'PUT', apt, extractFirebaseIdToken(req));
    res.json({ appointment: apt });
  });

  app.patch('/api/admin/reviews/:id', requireOwnerAuth, (req, res) => {
    const body = req.body as {
      visible?: boolean;
      featured?: boolean;
      ownerReply?: string;
    };
    const store = loadStore();
    const review = store.reviews.find((r) => r.id === req.params.id);
    if (!review) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    if (typeof body.visible === 'boolean') review.visible = body.visible;
    if (typeof body.featured === 'boolean') review.featured = body.featured;
    if (typeof body.ownerReply === 'string') review.ownerReply = body.ownerReply.trim() || undefined;
    saveStore(store);
    void mirrorToFirebaseRtdb(`reviews/${review.id}`, 'PUT', review, extractFirebaseIdToken(req));
    res.json({ review });
  });

  app.delete('/api/admin/reviews/:id', requireOwnerAuth, (req, res) => {
    const store = loadStore();
    const before = store.reviews.length;
    store.reviews = store.reviews.filter((r) => r.id !== req.params.id);
    if (store.reviews.length === before) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    saveStore(store);
    void mirrorToFirebaseRtdb(`reviews/${req.params.id}`, 'DELETE', undefined, extractFirebaseIdToken(req));
    res.json({ ok: true });
  });

  app.put('/api/admin/shop', requireOwnerAuth, (req, res) => {
    const body = req.body as Partial<ShopDetails>;
    const store = loadStore();
    const prev = store.shopDetails;
    store.shopDetails = {
      businessName: String(body.businessName ?? prev.businessName).trim() || prev.businessName,
      tagline: String(body.tagline ?? prev.tagline).trim() || prev.tagline,
      address: String(body.address ?? prev.address).trim() || prev.address,
      landmark: String(body.landmark ?? prev.landmark).trim() || prev.landmark,
      city: String(body.city ?? prev.city).trim() || prev.city,
      pincode: String(body.pincode ?? prev.pincode).trim() || prev.pincode,
      phone: String(body.phone ?? prev.phone).trim() || prev.phone,
      whatsappDigits: String(body.whatsappDigits ?? prev.whatsappDigits).replace(/\D/g, '') || prev.whatsappDigits,
      hours: String(body.hours ?? prev.hours).trim() || prev.hours,
      announcement: String(body.announcement ?? prev.announcement).trim(),
      googleBusinessUrl: String(body.googleBusinessUrl ?? prev.googleBusinessUrl).trim() || prev.googleBusinessUrl,
      googleMapsUrl: String(body.googleMapsUrl ?? prev.googleMapsUrl).trim() || prev.googleMapsUrl,
      youtubeUrl:
        typeof body.youtubeUrl === 'string'
          ? body.youtubeUrl.trim()
          : (prev.youtubeUrl ?? 'https://youtube.com/@deesufashiondesigner?si=NTjEtf-O3dJb6ocE'),
      instagramUrl:
        typeof body.instagramUrl === 'string'
          ? body.instagramUrl.trim()
          : (prev.instagramUrl ?? 'https://www.instagram.com/deesufashion?dlrf=aGRyaWttNWE0NnNy'),
      facebookUrl:
        typeof body.facebookUrl === 'string'
          ? body.facebookUrl.trim()
          : (prev.facebookUrl ?? 'https://www.facebook.com/deesuCollection'),
      baseDirectoryRating:
        typeof body.baseDirectoryRating === 'number' && body.baseDirectoryRating >= 1 && body.baseDirectoryRating <= 5
          ? Number(body.baseDirectoryRating.toFixed(1))
          : prev.baseDirectoryRating,
      baseDirectoryReviewCount:
        typeof body.baseDirectoryReviewCount === 'number' && body.baseDirectoryReviewCount >= 0
          ? Math.floor(body.baseDirectoryReviewCount)
          : prev.baseDirectoryReviewCount,
    };
    saveStore(store);
    void mirrorToFirebaseRtdb('site/shopDetails', 'PUT', store.shopDetails, extractFirebaseIdToken(req));
    res.json({ shopDetails: store.shopDetails });
  });

  app.put('/api/admin/catalog', requireOwnerAuth, (req, res) => {
    const body = req.body as Partial<CatalogConfig>;
    const store = loadStore();
    const prev = store.catalog;

    const services = Array.isArray(body.services)
      ? body.services
          .map((s, idx) => ({
            number: String(s.number ?? String(idx + 1).padStart(2, '0')).trim() || String(idx + 1).padStart(2, '0'),
            title: String(s.title ?? '').trim(),
            description: String(s.description ?? '').trim(),
            startingPrice: Math.max(0, Number(s.startingPrice) || 0),
            highlights: Array.isArray(s.highlights)
              ? s.highlights.map((h) => String(h).trim()).filter(Boolean)
              : [],
          }))
          .filter((s) => s.title.length > 0)
      : prev.services;

    const designPatterns = Array.isArray(body.designPatterns)
      ? body.designPatterns
          .map((p) => ({
            name: String(p.name ?? '').trim(),
            category: String(p.category ?? 'Pattern').trim() || 'Pattern',
            note: String(p.note ?? '').trim(),
          }))
          .filter((p) => p.name.length > 0)
      : prev.designPatterns;

    const matchingRates = Array.isArray(body.matchingRates)
      ? body.matchingRates
          .map((m) => ({
            name: String(m.name ?? '').trim(),
            spec: String(m.spec ?? '').trim(),
            rateRange: String(m.rateRange ?? '').trim(),
            unit: String(m.unit ?? '').trim(),
          }))
          .filter((m) => m.name.length > 0)
      : prev.matchingRates;

    const estimatorGarments = Array.isArray(body.estimatorGarments)
      ? body.estimatorGarments
          .map((g, idx) => ({
            id: String(g.id ?? `garment-${Date.now()}-${idx}`).trim() || `garment-${Date.now()}-${idx}`,
            name: String(g.name ?? '').trim(),
            basePrice: Math.max(0, Number(g.basePrice) || 0),
            category: (g.category === 'Blouse' || g.category === 'Suit & Kurti' || g.category === 'Bridal & Gown'
              ? g.category
              : 'Blouse') as 'Blouse' | 'Suit & Kurti' | 'Bridal & Gown',
          }))
          .filter((g) => g.name.length > 0)
      : prev.estimatorGarments;

    const estimatorTurnarounds = Array.isArray(body.estimatorTurnarounds)
      ? body.estimatorTurnarounds
          .map((t, idx) => ({
            id: String(t.id ?? `speed-${Date.now()}-${idx}`).trim() || `speed-${Date.now()}-${idx}`,
            name: String(t.name ?? '').trim(),
            fee: Math.max(0, Number(t.fee) || 0),
            windowLabel: String(t.windowLabel ?? '').trim() || 'Standard',
          }))
          .filter((t) => t.name.length > 0)
      : prev.estimatorTurnarounds;

    const estimatorAddons = Array.isArray(body.estimatorAddons)
      ? body.estimatorAddons
          .map((a, idx) => ({
            id: String(a.id ?? `addon-${Date.now()}-${idx}`).trim() || `addon-${Date.now()}-${idx}`,
            label: String(a.label ?? '').trim(),
            shortLabel: String(a.shortLabel ?? a.label ?? '').trim(),
            price: Math.max(0, Number(a.price) || 0),
          }))
          .filter((a) => a.label.length > 0)
      : prev.estimatorAddons;

    if (estimatorGarments.length === 0 || estimatorTurnarounds.length === 0) {
      res.status(400).json({ error: 'Cost estimator must have at least one garment and one turnaround speed.' });
      return;
    }

    store.catalog = {
      services,
      designPatterns,
      matchingRates,
      estimatorGarments,
      estimatorTurnarounds,
      estimatorAddons,
    };
    saveStore(store);
    const firebaseToken = extractFirebaseIdToken(req);
    void mirrorToFirebaseRtdb('services', 'PUT', serializeCatalogForRtdbServices(store.catalog), firebaseToken);
    void mirrorToFirebaseRtdb('site/catalog', 'PUT', store.catalog, firebaseToken);
    res.json({ catalog: store.catalog });
  });

  // --- Frontend Serving (Vite in dev, dist/ in prod) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deeksha Ladies Tailor server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
