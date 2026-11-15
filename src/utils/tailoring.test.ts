import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStitchingEstimate,
  computeOrderBalance,
  computeReviewSummary,
  filterOrders,
  normalizeIndianPhone,
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
