import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDirectEnquiryWhatsAppUrl,
  calculateStitchingEstimate,
  computeOrderBalance,
  computeReviewSummary,
  filterOrders,
  mapBillingHtmlOrders,
  mergeTrackedOrders,
  normalizeIndianPhone,
  toTrackedOrderResult,
  validateAppointmentInput,
  validateReviewInput,
} from './tailoring.ts';
import type { CustomerReview, TailoringOrder } from '../types.ts';

test('calculateStitchingEstimate computes base, turnaround, and addons accurately', () => {
  const res = calculateStitchingEstimate({
    garmentId: 'alite-blouse',
    turnaroundId: 'express',
    addonIds: ['cups', 'piping', 'cups'], // duplicate should deduplicate
  });
  assert.equal(res.basePrice, 350);
  assert.equal(res.turnaroundFee, 150);
  assert.equal(res.addonsTotal, 180); // 120 + 60
  assert.equal(res.total, 680);
  assert.equal(res.selectedAddonLabels.length, 2);
  assert.ok(res.whatsappUrl.includes('680'));
});

test('calculateStitchingEstimate uses custom owner-configured catalog prices', () => {
  const res = calculateStitchingEstimate({
    garmentId: 'custom-blouse',
    turnaroundId: 'urgent',
    addonIds: ['lace'],
    catalog: {
      estimatorGarments: [{ id: 'custom-blouse', name: 'Silk Designer Blouse', basePrice: 500, category: 'Blouse' }],
      estimatorTurnarounds: [{ id: 'urgent', name: 'Same Day', fee: 200, windowLabel: 'Today' }],
      estimatorAddons: [{ id: 'lace', label: 'Zari Lace', shortLabel: 'Zari Lace', price: 90 }],
    },
  });
  assert.equal(res.total, 790);
  assert.equal(res.garmentName, 'Silk Designer Blouse');
});

test('calculateStitchingEstimate does not fall back to hardcoded defaults when cloud catalog is empty', () => {
  const res = calculateStitchingEstimate({
    garmentId: 'alite-blouse',
    turnaroundId: 'express',
    addonIds: ['cups'],
    catalog: {
      estimatorGarments: [],
      estimatorTurnarounds: [],
      estimatorAddons: [],
    },
  });
  assert.equal(res.basePrice, 0);
  assert.equal(res.turnaroundFee, 0);
  assert.equal(res.total, 0);
});

test('computeOrderBalance clamps non-negative balance', () => {
  assert.equal(computeOrderBalance(1200, 500), 700);
  assert.equal(computeOrderBalance(500, 700), 0);
});

test('filterOrders matches phone digits, bill numbers, customer names, and status filter', () => {
  const sample: TailoringOrder[] = [
    {
      id: '1',
      orderNo: '101',
      customerName: 'Ananya Chatterjee',
      phone: '9831200001',
      items: [{ id: 'i1', desc: 'Alite Cut Blouse', qty: 1, isDelivered: true }],
      totalAmount: 450,
      advancePaid: 200,
      balance: 250,
      deliveryDate: '2026-11-18',
      status: 'Ready',
      createdAt: '2026-11-14T10:00:00Z',
    },
    {
      id: '2',
      orderNo: '102',
      customerName: 'Rituparna Sen',
      phone: '9830011223',
      items: [{ id: 'i2', desc: 'Anarkali Suit', qty: 1, isDelivered: false }],
      totalAmount: 750,
      advancePaid: 750,
      balance: 0,
      deliveryDate: '2026-11-20',
      status: 'In Progress',
      createdAt: '2026-11-14T11:00:00Z',
    },
  ];

  assert.equal(filterOrders(sample, '101').length, 1);
  assert.equal(filterOrders(sample, '+91 98300-11223').length, 1);
  assert.equal(filterOrders(sample, 'ananya').length, 1);
  assert.equal(filterOrders(sample, '', 'Ready').length, 1);
  assert.equal(filterOrders(sample, '101', 'Delivered').length, 0);
});

test('mapBillingHtmlOrders normalizes billing HTML localStorage JSON safely', () => {
  const rawJson = JSON.stringify([
    {
      id: 'ord-1731-abc',
      orderNo: '205',
      customerName: 'Srabani Mukherjee',
      phone: '+91 98312 55443',
      deliveryDate: '2026-11-22',
      status: 'Partial Delivered',
      qualityNotes: 'Piping in gold zari',
      items: [
        { desc: 'Prince Cut Blouse', qty: 1, rate: 450, total: 450, isDelivered: true },
        { desc: 'Saree Fall & Pico', qty: 2, rate: 60, total: 120, isDelivered: false },
      ],
      subtotal: 570,
      discount: 20,
      advance: 200,
      finalPaid: 50,
      totalPaid: 250,
      balance: 300,
      updatedAt: '2026-11-15T10:00:00.000Z',
    },
    null,
    { bad: true },
  ]);

  const mapped = mapBillingHtmlOrders(rawJson);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].orderNo, '205');
  assert.equal(mapped[0].phone, '9831255443');
  assert.equal(mapped[0].totalAmount, 550);
  assert.equal(mapped[0].advancePaid, 250);
  assert.equal(mapped[0].balance, 300);
  assert.equal(mapped[0].status, 'Partial Delivered');
  assert.equal(mapped[0].items.length, 2);
  assert.equal(mapped[0].items[0].id, 'itm-0-0');
  assert.equal(mapped[0].notes, 'Piping in gold zari');

  assert.deepEqual(mapBillingHtmlOrders('not-valid-json'), []);
});

test('mergeTrackedOrders prefers primary local billing orders and deduplicates by id/orderNo', () => {
  const local = [
    toTrackedOrderResult({
      id: 'ord-1',
      orderNo: '301',
      customerName: 'Ruma Sen',
      phone: '9831211111',
      items: [{ id: 'i1', desc: 'Designer Blouse', qty: 1, isDelivered: true }],
      totalAmount: 500,
      advancePaid: 500,
      balance: 0,
      deliveryDate: '2026-11-20',
      status: 'Ready',
      createdAt: '2026-11-15T10:00:00Z',
    }),
  ];
  const server = [
    toTrackedOrderResult({
      id: 'ord-1-old',
      orderNo: '301',
      customerName: 'Ruma Sen',
      phone: '9831211111',
      items: [{ id: 'i1', desc: 'Designer Blouse', qty: 1, isDelivered: false }],
      totalAmount: 500,
      advancePaid: 200,
      balance: 300,
      deliveryDate: '2026-11-20',
      status: 'Booked',
      createdAt: '2026-11-15T09:00:00Z',
    }),
    toTrackedOrderResult({
      id: 'ord-2',
      orderNo: '302',
      customerName: 'Puja Das',
      phone: '9831222222',
      items: [{ id: 'i2', desc: 'Kurti', qty: 1, isDelivered: false }],
      totalAmount: 350,
      advancePaid: 100,
      balance: 250,
      deliveryDate: '2026-11-21',
      status: 'In Progress',
      createdAt: '2026-11-15T09:30:00Z',
    }),
  ];

  const merged = mergeTrackedOrders(local, server);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].status, 'Ready');
  assert.equal(merged[1].orderNo, '302');
});

test('validateAppointmentInput checks Indian 10-digit phone and name', () => {
  assert.equal(validateAppointmentInput({ name: 'Priya', phone: '+91 9831200001' }).valid, true);
  assert.equal(validateAppointmentInput({ name: 'P', phone: '9831200001' }).valid, false);
  assert.equal(validateAppointmentInput({ name: 'Priya', phone: '12345' }).valid, false);
  assert.equal(normalizeIndianPhone('+91 98312 00001'), '9831200001');
});

test('validateReviewInput enforces rating bounds and comment length', () => {
  assert.equal(
    validateReviewInput({
      customerName: 'Moumita Das',
      rating: 5,
      service: 'Designer Blouse',
      comment: 'Perfect shoulder fit and clean piping finish.',
    }).valid,
    true,
  );
  assert.equal(
    validateReviewInput({
      customerName: 'Moumita Das',
      rating: 6,
      service: 'Designer Blouse',
      comment: 'Too high rating',
    }).valid,
    false,
  );
});

test('computeReviewSummary blends directory base reviews with new visible website reviews', () => {
  const reviews: CustomerReview[] = [
    {
      id: 'r1',
      customerName: 'Sohini Roy',
      rating: 5,
      service: 'Prince Cut Blouse',
      comment: 'Great fitting.',
      source: 'Website Customer',
      visitDate: 'Nov 2026',
      visible: true,
      featured: true,
      createdAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 'r2',
      customerName: 'Hidden User',
      rating: 1,
      service: 'Alteration',
      comment: 'Hidden test',
      source: 'Website Customer',
      visitDate: 'Nov 2026',
      visible: false,
      featured: false,
      createdAt: '2026-11-14T10:00:00Z',
    },
  ];
  const summary = computeReviewSummary(reviews, 4.8, 35, 'https://share.google/zbgBH15WaKYkn3CG8');
  assert.equal(summary.totalReviewsCount, 36);
  assert.equal(summary.averageRating, 4.8);
});

test('buildDirectEnquiryWhatsAppUrl formats direct WhatsApp enquiry links cleanly', () => {
  const url = buildDirectEnquiryWhatsAppUrl('917449531663', {
    name: 'Priya',
    notes: '2 Prince Cut Blouses',
  });
  assert.ok(url.startsWith('https://api.whatsapp.com/send?phone=917449531663&text='));
  assert.ok(decodeURIComponent(url).includes('Priya'));
  assert.ok(decodeURIComponent(url).includes('2 Prince Cut Blouses'));
});
