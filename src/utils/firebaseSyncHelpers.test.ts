import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRtdbCollectionPatch,
  extractRtdbRecords,
  filterCustomerPublicOrders,
  formatAdminLoginEmail,
  getAdminLoginEmailCandidates,
  mergeReviewsWithCloud,
  normalizeReviewRecord,
  parseRtdbServicesSnapshot,
  sanitizeRtdbKey,
  serializeCatalogForRtdbServices,
} from './firebaseSyncHelpers.ts';
import { DEFAULT_CATALOG } from './tailoring.ts';

test('formatAdminLoginEmail appends @deekshatailors.com when no @ is typed and preserves full emails', () => {
  assert.equal(formatAdminLoginEmail('7449531663'), '7449531663@deekshatailors.com');
  assert.equal(formatAdminLoginEmail('+91 74495 31663'), '7449531663@deekshatailors.com');
  assert.equal(formatAdminLoginEmail('7449531663@deekshaladiestailor.com'), '7449531663@deekshaladiestailor.com');
  assert.equal(formatAdminLoginEmail('deeksha_admin'), 'deeksha_admin@deekshatailors.com');
  assert.equal(formatAdminLoginEmail('   '), '');
});

test('getAdminLoginEmailCandidates tries @deekshatailors.com first and includes legacy domain fallback', () => {
  assert.deepEqual(getAdminLoginEmailCandidates('7449531663'), [
    '7449531663@deekshatailors.com',
    '7449531663@deekshaladiestailor.com',
  ]);
  assert.deepEqual(getAdminLoginEmailCandidates('owner@custom.com'), ['owner@custom.com']);
  assert.deepEqual(getAdminLoginEmailCandidates('   '), []);
});

test('filterCustomerPublicOrders searches by Bill No or 10-digit mobile and hides measurements & financial totals', () => {
  const rtdbOrdersMap = {
    'ord-1': {
      id: 'ord-1',
      orderNo: '101',
      customerName: 'Secret Name',
      phone: '9831200001',
      deliveryDate: '2026-11-22',
      status: 'Ready',
      measurements: { length: '14.5', cheast: '36', kamar: '30' },
      subtotal: 950,
      discount: 50,
      advance: 400,
      finalPaid: 100,
      totalPaid: 500,
      balance: 400,
      sketch: 'data:image/png;base64,ABC',
      staffId: 'stf-1',
      items: [{ desc: 'Alite Cut Blouse', qty: 1, rate: 950, total: 950, isDelivered: true }],
    },
    'ord-2': {
      id: 'ord-2',
      orderNo: '102',
      customerName: 'Other Customer',
      phone: '9830011223',
      deliveryDate: '2026-11-25',
      status: 'Booked',
      balance: 250,
      items: [{ desc: 'Kurti', qty: 1, isDelivered: false }],
    },
  };

  const byBill = filterCustomerPublicOrders(rtdbOrdersMap, '#101');
  assert.equal(byBill.length, 1);
  assert.equal(byBill[0].orderNo, '101');
  assert.equal(byBill[0].status, 'Ready');
  assert.equal(byBill[0].deliveryDate, '2026-11-22');
  assert.equal(byBill[0].balance, 400);
  assert.equal(byBill[0].items.length, 1);

  // Ensure measurements, financial totals, sketch, staff, and private PII are absent
  const record = byBill[0] as unknown as Record<string, unknown>;
  assert.equal('measurements' in record, false);
  assert.equal('subtotal' in record, false);
  assert.equal('totalAmount' in record, false);
  assert.equal('advancePaid' in record, false);
  assert.equal('advance' in record, false);
  assert.equal('discount' in record, false);
  assert.equal('sketch' in record, false);
  assert.equal('staffId' in record, false);
  assert.equal('customerName' in record, false);
  assert.equal('phone' in record, false);

  const byPhone = filterCustomerPublicOrders(rtdbOrdersMap, '+91 98300 11223');
  assert.equal(byPhone.length, 1);
  assert.equal(byPhone[0].orderNo, '102');
});

test('computeRtdbCollectionPatch never overwrites cloud data with empty list and diffs updates/deletes safely', () => {
  const cloudMap = {
    'ord-1': { id: 'ord-1', orderNo: '101', status: 'Booked' },
    'ord-2': { id: 'ord-2', orderNo: '102', status: 'Ready' },
  };

  // Empty local list MUST return null even if allowDeletions is true
  assert.equal(
    computeRtdbCollectionPatch({
      localItems: [],
      cloudMap,
      getKey: (item) => String(item.id),
      allowDeletions: true,
    }),
    null,
  );

  // Updating one order and adding a new one without deletions
  const patchUpdate = computeRtdbCollectionPatch({
    localItems: [
      { id: 'ord-1', orderNo: '101', status: 'Ready' },
      { id: 'ord-2', orderNo: '102', status: 'Ready' },
      { id: 'ord-3', orderNo: '103', status: 'Booked' },
    ],
    cloudMap,
    getKey: (item) => String(item.id),
    allowDeletions: false,
  });
  assert.deepEqual(patchUpdate, {
    'ord-1': { id: 'ord-1', orderNo: '101', status: 'Ready' },
    'ord-3': { id: 'ord-3', orderNo: '103', status: 'Booked' },
  });

  // Deleting one item when allowDeletions is true marks only that key null
  const patchDelete = computeRtdbCollectionPatch({
    localItems: [{ id: 'ord-1', orderNo: '101', status: 'Booked' }],
    cloudMap,
    getKey: (item) => String(item.id),
    allowDeletions: true,
  });
  assert.deepEqual(patchDelete, { 'ord-2': null });
});

test('extractRtdbRecords and sanitizeRtdbKey normalize RTDB structures and preserve push() keys', () => {
  assert.deepEqual(extractRtdbRecords(null), []);
  assert.equal(extractRtdbRecords([{ id: '1' }, null]).length, 1);
  const pushed = extractRtdbRecords<{ id?: string; customerName?: string }>({
    '-NpushKey123': { customerName: 'Riya' },
    _meta: { v: 1 },
  });
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].id, '-NpushKey123');
  assert.equal(sanitizeRtdbKey('2026-11-15/stf.1#a'), '2026-11-15_stf_1_a');
});

test('parseRtdbServicesSnapshot treats cloud /services data as authoritative without hardcoded fallback', () => {
  const serialized = serializeCatalogForRtdbServices({
    ...DEFAULT_CATALOG,
    services: [
      {
        number: '01',
        title: 'Custom Bridal Blouse',
        description: 'Cloud rate',
        startingPrice: 999,
        highlights: ['Cloud sync'],
      },
    ],
    estimatorAddons: [],
  });
  const parsed = parseRtdbServicesSnapshot(serialized);
  assert.equal(parsed.initialized, true);
  assert.equal(parsed.catalog.services.length, 1);
  assert.equal(parsed.catalog.services[0].startingPrice, 999);
  assert.equal(parsed.catalog.estimatorAddons.length, 0);

  // Explicit empty array once initialized in cloud MUST NOT revert to DEFAULT_CATALOG
  const clearedServices = parseRtdbServicesSnapshot({
    catalogInitialized: true,
    services: [],
  });
  assert.equal(clearedServices.initialized, true);
  assert.equal(clearedServices.catalog.services.length, 0);
});

test('mergeReviewsWithCloud preserves baseline and cloud reviews together and respects explicit deletedReviewIds', () => {
  const baseline = [
    {
      id: 'rev-1',
      customerName: 'Srabani Roy',
      rating: 5,
      service: 'Designer Blouse',
      comment: 'Great fitting!',
      source: 'Google Business Profile' as const,
      visitDate: 'Oct 2026',
      visible: true,
      featured: true,
      createdAt: '2026-10-24T12:00:00.000Z',
    },
    {
      id: 'rev-2',
      customerName: 'Paramita Bose',
      rating: 5,
      service: 'Bridal Blouse',
      comment: 'Zero puckering.',
      source: 'Justdial Verified' as const,
      visitDate: 'Oct 2026',
      visible: true,
      featured: false,
      createdAt: '2026-10-12T12:00:00.000Z',
    },
  ];
  const cloudNew = {
    id: 'rev-999',
    name: 'Ananya',
    rating: 5,
    service: 'Prince Cut Blouse',
    text: 'Loved the piping finish.',
    source: 'Website Customer',
    date: 'Nov 2026',
    visible: true,
    featured: false,
    createdAt: '2026-11-15T01:00:00.000Z',
  };
  const cloudEditedBaseline = {
    ...baseline[0],
    ownerReply: 'Thank you Srabani ji!',
  };

  // Even when reviewsInitialized is true, baseline reviews remain visible alongside cloud reviews
  const merged = mergeReviewsWithCloud({
    cloudReviews: [cloudNew, cloudEditedBaseline],
    baselineReviews: baseline,
    reviewsInitialized: true,
  });
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'rev-999');
  assert.equal(merged[0].customerName, 'Ananya');
  assert.equal(merged[0].comment, 'Loved the piping finish.');
  assert.equal(merged[1].id, 'rev-1');
  assert.equal(merged[1].ownerReply, 'Thank you Srabani ji!');
  assert.equal(merged[2].id, 'rev-2');

  // Deleted review IDs stay excluded from both cloud and baseline
  const afterDelete = mergeReviewsWithCloud({
    cloudReviews: [cloudNew, cloudEditedBaseline],
    baselineReviews: baseline,
    deletedReviewIds: { 'rev-2': true, 'rev-999': true },
  });
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0].id, 'rev-1');
  assert.equal(normalizeReviewRecord({ id: 'x', test: true }), null);
});

