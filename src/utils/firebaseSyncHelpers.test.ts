import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRtdbCollectionPatch,
  extractRtdbRecords,
  filterCustomerPublicOrders,
  formatAdminLoginEmail,
  sanitizeRtdbKey,
} from './firebaseSyncHelpers.ts';

test('formatAdminLoginEmail appends @deekshaladiestailor.com when no @ is typed and preserves full emails', () => {
  assert.equal(formatAdminLoginEmail('7449531663'), '7449531663@deekshaladiestailor.com');
  assert.equal(formatAdminLoginEmail('+91 74495 31663'), '7449531663@deekshaladiestailor.com');
  assert.equal(formatAdminLoginEmail('owner@deekshaladiestailor.com'), 'owner@deekshaladiestailor.com');
  assert.equal(formatAdminLoginEmail('deeksha_admin'), 'deeksha_admin@deekshaladiestailor.com');
  assert.equal(formatAdminLoginEmail('   '), '');
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

test('extractRtdbRecords and sanitizeRtdbKey normalize RTDB structures safely', () => {
  assert.deepEqual(extractRtdbRecords(null), []);
  assert.equal(extractRtdbRecords([{ id: '1' }, null]).length, 1);
  assert.equal(extractRtdbRecords({ a: { id: '1' }, b: { id: '2' } }).length, 2);
  assert.equal(sanitizeRtdbKey('2026-11-15/stf.1#a'), '2026-11-15_stf_1_a');
});
