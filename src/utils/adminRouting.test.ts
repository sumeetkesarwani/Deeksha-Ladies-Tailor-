import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdminShortcutHash,
  resolveAdminShortcutScreen,
  stripAdminHashFromUrl,
} from './adminRouting.ts';

test('isAdminShortcutHash detects #admin variants accurately and ignores storefront anchors', () => {
  assert.equal(isAdminShortcutHash('#admin'), true);
  assert.equal(isAdminShortcutHash('#ADMIN'), true);
  assert.equal(isAdminShortcutHash('#/admin'), true);
  assert.equal(isAdminShortcutHash('#admin/'), true);
  assert.equal(isAdminShortcutHash('#admin?tab=billing'), true);

  assert.equal(isAdminShortcutHash(''), false);
  assert.equal(isAdminShortcutHash('#services'), false);
  assert.equal(isAdminShortcutHash('#reviews'), false);
  assert.equal(isAdminShortcutHash('#track-order'), false);
  assert.equal(isAdminShortcutHash('#admin-help'), false);
});

test('resolveAdminShortcutScreen skips public storefront on #admin across auth states', () => {
  // While Firebase IndexedDB persistence is still resolving on #admin, show loading screen (never public storefront)
  assert.equal(
    resolveAdminShortcutScreen({
      isAdminHash: true,
      authResolved: false,
      hasAuthUser: false,
      activeView: 'public',
    }),
    'loading-auth',
  );

  // Signed out on #admin shows standalone login directly
  assert.equal(
    resolveAdminShortcutScreen({
      isAdminHash: true,
      authResolved: true,
      hasAuthUser: false,
      activeView: 'public',
    }),
    'standalone-login',
  );

  // Already signed in on #admin opens Bill Entry / Admin Dashboard immediately
  assert.equal(
    resolveAdminShortcutScreen({
      isAdminHash: true,
      authResolved: true,
      hasAuthUser: true,
      activeView: 'public',
    }),
    'dashboard',
  );

  // Normal storefront URL defaults to public even when signed in until Admin Dashboard is clicked
  assert.equal(
    resolveAdminShortcutScreen({
      isAdminHash: false,
      authResolved: true,
      hasAuthUser: true,
      activeView: 'public',
    }),
    'public',
  );
});

test('stripAdminHashFromUrl removes #admin while preserving non-admin anchors and query params', () => {
  assert.equal(
    stripAdminHashFromUrl({ pathname: '/', search: '', hash: '#admin' }),
    '/',
  );
  assert.equal(
    stripAdminHashFromUrl({ pathname: '/index.html', search: '?v=1', hash: '#/admin' }),
    '/index.html?v=1',
  );
  assert.equal(
    stripAdminHashFromUrl({ pathname: '/', search: '', hash: '#reviews' }),
    '/#reviews',
  );
});
