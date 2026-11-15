import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  AppointmentStatus,
  CustomerReview,
  FittingAppointment,
  OrderStatus,
  ShopDetails,
  TailoringOrder,
} from './src/types.ts';
import {
  computeOrderBalance,
  computeReviewSummary,
  filterOrders,
  normalizeIndianPhone,
  validateAppointmentInput,
  validateReviewInput,
} from './src/utils/tailoring.ts';

interface OwnerAccount {
  businessId: string;
  ownerName: string;
  passwordSalt: string;
  passwordHash: string;
}

interface PersistedStore {
  owner: OwnerAccount;
  shopDetails: ShopDetails;
  orders: TailoringOrder[];
  appointments: FittingAppointment[];
  reviews: CustomerReview[];
}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'deeksha_tailors_rajarhat_session_key_2026';
const COOKIE_NAME = 'deeksha_owner_session';

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
      googleMapsUrl: 'https://maps.google.com/?q=211+Road,+Opposite+Bazaar+Kolkata,+Rajarhat,+Kolkata+700135',
      baseDirectoryRating: 4.8,
      baseDirectoryReviewCount: 35,
    },
    orders: [
      {
        id: 'ord-101',
        orderNo: '101',
        customerName: 'Ananya Chatterjee',
        phone: '9831200001',
        items: [
          { id: 'itm-1', desc: 'Alite Cut Designer Blouse (Padded)', qty: 1, isDelivered: true },
          { id: 'itm-2', desc: 'Saree Fall & Interlock Pico', qty: 1, isDelivered: true },
        ],
        totalAmount: 530,
        advancePaid: 250,
        balance: 280,
        deliveryDate: '2026-11-16',
        status: 'Ready',
        notes: 'Crimson silk blouse with cotton rubia astar',
        createdAt: '2026-11-12T10:30:00.000Z',
      },
      {
        id: 'ord-102',
        orderNo: '102',
        customerName: 'Rituparna Sen',
        phone: '9830011223',
        items: [
          { id: 'itm-3', desc: 'Anarkali Suit Set with Crepe Lining', qty: 1, isDelivered: false },
          { id: 'itm-4', desc: 'Prince Cut Blouse', qty: 1, isDelivered: true },
        ],
        totalAmount: 1150,
        advancePaid: 600,
        balance: 550,
        deliveryDate: '2026-11-19',
        status: 'In Progress',
        notes: 'Express finishing requested for family reception',
        createdAt: '2026-11-13T14:15:00.000Z',
      },
      {
        id: 'ord-103',
        orderNo: '103',
        customerName: 'Moumita Bhattacharya',
        phone: '9874512345',
        items: [{ id: 'itm-5', desc: 'Sabyasachi Bridal Cut Blouse + Pearl Latkan', qty: 1, isDelivered: true }],
        totalAmount: 650,
        advancePaid: 650,
        balance: 0,
        deliveryDate: '2026-11-14',
        status: 'Delivered',
        createdAt: '2026-11-08T11:00:00.000Z',
      },
    ],
    appointments: [
      {
        id: 'apt-1',
        name: 'Shreya Mukherjee',
        phone: '9831456789',
        preferredDate: '2026-11-16',
        timeSlot: 'Evening (5:00 PM - 8:30 PM)',
        notes: '2 Padded Prince Cut blouses + matching rubia cotton astar',
        status: 'Confirmed',
        createdAt: '2026-11-14T09:15:00.000Z',
      },
      {
        id: 'apt-2',
        name: 'Debolina Ghosh',
        phone: '9836543210',
        preferredDate: '2026-11-17',
        timeSlot: 'Morning (11:00 AM - 1:00 PM)',
        notes: 'Alia cut kurti set stitching and saree fall/pico',
        status: 'Pending',
        createdAt: '2026-11-14T16:40:00.000Z',
      },
    ],
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
  return JSON.parse(raw) as PersistedStore;
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

function requireOwnerAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in with your Business ID and password.' });
    return;
  }
  const verified = verifySessionToken(token);
  const store = loadStore();
  if (!verified || verified.businessId !== store.owner.businessId) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  loadStore();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

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
    const matches = filterOrders(store.orders, q).map((order) => ({
      id: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName,
      phoneMasked: order.phone.length >= 4 ? `••••••${order.phone.slice(-4)}` : order.phone,
      items: order.items,
      totalAmount: order.totalAmount,
      advancePaid: order.advancePaid,
      balance: order.balance,
      deliveryDate: order.deliveryDate,
      status: order.status,
      notes: order.notes,
    }));
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

    res.status(201).json({ appointment: created });
  });

  app.post('/api/reviews', (req, res) => {
    const body = req.body as {
      customerName?: string;
      rating?: number;
      service?: string;
      comment?: string;
    };
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
      id: `rev-${Date.now()}`,
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
    store.reviews.unshift(created);
    saveStore(store);

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
      reviewSummary,
    });
  });

  app.post('/api/admin/orders', requireOwnerAuth, (req, res) => {
    const body = req.body as {
      orderNo?: string;
      customerName?: string;
      phone?: string;
      itemDesc?: string;
      qty?: number;
      totalAmount?: number;
      advancePaid?: number;
      deliveryDate?: string;
      status?: OrderStatus;
      notes?: string;
    };

    const customerName = String(body.customerName ?? '').trim();
    const phone = normalizeIndianPhone(String(body.phone ?? ''));
    const itemDesc = String(body.itemDesc ?? '').trim();
    const qty = Math.max(1, Number(body.qty) || 1);
    const totalAmount = Math.max(0, Number(body.totalAmount) || 0);
    const advancePaid = Math.max(0, Number(body.advancePaid) || 0);

    if (customerName.length < 2 || !/^[6-9]\d{9}$/.test(phone) || itemDesc.length < 2) {
      res.status(400).json({ error: 'Customer name, valid 10-digit phone, and garment description are required.' });
      return;
    }

    const store = loadStore();
    const nextNo =
      String(body.orderNo ?? '').trim() ||
      String(
        store.orders.reduce((max, o) => {
          const n = Number(o.orderNo);
          return Number.isFinite(n) && n > max ? n : max;
        }, 100) + 1,
      );

    const created: TailoringOrder = {
      id: `ord-${Date.now()}`,
      orderNo: nextNo,
      customerName,
      phone,
      items: [{ id: `itm-${Date.now()}`, desc: itemDesc, qty, isDelivered: body.status === 'Ready' || body.status === 'Delivered' }],
      totalAmount,
      advancePaid,
      balance: computeOrderBalance(totalAmount, advancePaid),
      deliveryDate: String(body.deliveryDate ?? '').trim() || 'Within 4–5 Days',
      status: body.status || 'Booked',
      notes: String(body.notes ?? '').trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    store.orders.unshift(created);
    saveStore(store);
    res.status(201).json({ order: created });
  });

  app.patch('/api/admin/orders/:id', requireOwnerAuth, (req, res) => {
    const { id } = req.params;
    const body = req.body as {
      status?: OrderStatus;
      advancePaid?: number;
      deliveryDate?: string;
      toggleItemId?: string;
    };
    const store = loadStore();
    const order = store.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (body.status) {
      order.status = body.status;
      if (body.status === 'Ready' || body.status === 'Delivered') {
        order.items = order.items.map((it) => ({ ...it, isDelivered: true }));
      }
    }
    if (typeof body.advancePaid === 'number') {
      order.advancePaid = Math.max(0, body.advancePaid);
      order.balance = computeOrderBalance(order.totalAmount, order.advancePaid);
    }
    if (typeof body.deliveryDate === 'string' && body.deliveryDate.trim()) {
      order.deliveryDate = body.deliveryDate.trim();
    }
    if (body.toggleItemId) {
      order.items = order.items.map((it) =>
        it.id === body.toggleItemId ? { ...it, isDelivered: !it.isDelivered } : it,
      );
    }

    saveStore(store);
    res.json({ order });
  });

  app.delete('/api/admin/orders/:id', requireOwnerAuth, (req, res) => {
    const store = loadStore();
    const before = store.orders.length;
    store.orders = store.orders.filter((o) => o.id !== req.params.id);
    if (store.orders.length === before) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    saveStore(store);
    res.json({ ok: true });
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
    res.json({ shopDetails: store.shopDetails });
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
