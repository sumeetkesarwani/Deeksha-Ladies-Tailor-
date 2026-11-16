export type AdminShortcutScreen = 'loading-auth' | 'standalone-login' | 'dashboard' | 'public';

/**
 * Checks whether the current URL hash targets the direct Admin / Bill Entry shortcut (#admin).
 * Supports #admin, #/admin, #admin/, and #admin?... (case-insensitive).
 */
export function isAdminShortcutHash(hash: string): boolean {
  const cleaned = String(hash ?? '')
    .trim()
    .replace(/^#\/?/, '')
    .toLowerCase();
  if (!cleaned) return false;
  return cleaned === 'admin' || cleaned.startsWith('admin/') || cleaned.startsWith('admin?');
}

/**
 * Resolves which top-level screen should render so that #admin never flashes or loads
 * the public storefront before auth persistence settles or when signed out.
 */
export function resolveAdminShortcutScreen(params: {
  isAdminHash: boolean;
  authResolved: boolean;
  hasAuthUser: boolean;
  activeView: 'public' | 'dashboard';
}): AdminShortcutScreen {
  const { isAdminHash, authResolved, hasAuthUser, activeView } = params;

  if (hasAuthUser && (activeView === 'dashboard' || isAdminHash)) {
    return 'dashboard';
  }

  if (isAdminHash) {
    if (!authResolved) {
      return 'loading-auth';
    }
    return hasAuthUser ? 'dashboard' : 'standalone-login';
  }

  return 'public';
}

/**
 * Removes #admin from a URL while preserving pathname, query string, and any non-admin hash.
 */
export function stripAdminHashFromUrl(url: { pathname: string; search: string; hash: string }): string {
  const base = `${url.pathname || '/'}${url.search || ''}`;
  if (isAdminShortcutHash(url.hash)) {
    return base;
  }
  return `${base}${url.hash || ''}`;
}
