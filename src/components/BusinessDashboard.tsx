import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Calendar,
  LogOut,
  Maximize2,
  Minimize2,
  Receipt,
  RotateCcw,
  Scissors,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import { firebaseAuth } from '../firebase.ts';
import type {
  AppointmentStatus,
  AuthUser,
  CatalogConfig,
  CustomerReview,
  FittingAppointment,
  ShopDetails,
} from '../types.ts';
import {
  BILLING_STORAGE_KEY,
} from '../utils/tailoring.ts';
import {
  ATTENDANCE_STORAGE_KEY,
  PRODUCTION_STORAGE_KEY,
  STAFF_STORAGE_KEY,
} from '../utils/firebaseSyncHelpers.ts';
import {
  createRtdbCollectionSync,
  deleteReviewFromRtdb,
  publishReviewToRtdb,
  saveAppointmentToRtdb,
  saveCatalogToRtdb,
  saveShopDetailsToRtdb,
  subscribeAppointmentsRtdb,
  subscribePublicStorefrontRtdb,
  type RtdbCollectionController,
} from '../utils/firebaseRtdb.ts';
import { CatalogEditorTab } from './CatalogEditorTab.tsx';

const BILLING_HTML_PATH = '/assets/aistudio/Deeksha_Ladies_Tailors___Matching_Center_cf67b9a2.html';

interface BillingIframeWindow extends Window {
  loadAllData?: () => void;
  setupAutoBillNumber?: () => void;
  populateStaffSelectors?: () => void;
  renderOrdersModalList?: (filterVal?: string) => void;
  renderStaffList?: () => void;
  renderAttendanceForDate?: () => void;
  renderProductionList?: () => void;
  calculateSalaryReport?: () => void;
  updateHeaderQuickFinanceSnapshot?: () => void;
  saveOrders?: () => void;
  saveStaffData?: () => void;
  saveAttendanceData?: () => void;
  saveProductionData?: () => void;
  confirmDeleteOrder?: (id: string) => void;
  deleteStaffProfile?: (id: string) => void;
  deleteProductionEntry?: (id: string) => void;
  showConfirm?: (title: string, msg: string, icon: string, onConfirm?: () => void) => void;
  __deekshaFirebaseHooked?: boolean;
}

interface BusinessDashboardProps {
  authUser: AuthUser;
  authToken: string;
  initialShopDetails: ShopDetails;
  initialCatalog: CatalogConfig;
  initialReviews: CustomerReview[];
  onLogout: () => void;
  onShopUpdated: (shopDetails: ShopDetails) => void;
  onCatalogUpdated: (catalog: CatalogConfig) => void;
  onReviewsUpdated: (reviews: CustomerReview[]) => void;
}

type AdminTab = 'billing' | 'appointments' | 'catalog' | 'reviews' | 'settings';

export function BusinessDashboard({
  authUser,
  authToken,
  initialShopDetails,
  initialCatalog,
  initialReviews,
  onLogout,
  onShopUpdated,
  onCatalogUpdated,
  onReviewsUpdated,
}: BusinessDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('billing');
  const [billingExpanded, setBillingExpanded] = useState(false);
  const [billingReloadKey, setBillingReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [error, setError] = useState('');

  const [appointments, setAppointments] = useState<FittingAppointment[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>(initialReviews);
  const [shopForm, setShopForm] = useState<ShopDetails | null>(initialShopDetails);
  const [catalog, setCatalog] = useState<CatalogConfig | null>(initialCatalog);

  const baselineReviewsRef = useRef<CustomerReview[]>(initialReviews);

  // Review reply editing
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>(() => {
    const drafts: Record<string, string> = {};
    initialReviews.forEach((r) => {
      drafts[r.id] = r.ownerReply ?? '';
    });
    return drafts;
  });

  const billingIframeRef = useRef<HTMLIFrameElement | null>(null);
  const ordersSyncRef = useRef<RtdbCollectionController<Record<string, unknown>> | null>(null);
  const staffSyncRef = useRef<RtdbCollectionController<Record<string, unknown>> | null>(null);
  const attendanceSyncRef = useRef<RtdbCollectionController<Record<string, unknown>> | null>(null);
  const productionSyncRef = useRef<RtdbCollectionController<Record<string, unknown>> | null>(null);

  const getAdminHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    try {
      const idToken = await firebaseAuth.currentUser?.getIdToken();
      if (idToken) {
        headers['X-Firebase-Id-Token'] = idToken;
      }
    } catch {
      // ignore token refresh edge case
    }
    return headers;
  }, [authToken]);

  const refreshBillingIframeFromStorage = useCallback(() => {
    const win = billingIframeRef.current?.contentWindow as BillingIframeWindow | null;
    if (!win) return;
    try {
      win.loadAllData?.();
      win.setupAutoBillNumber?.();
      win.populateStaffSelectors?.();
      const filterEl = win.document.getElementById('modal-orders-filter') as HTMLInputElement | null;
      win.renderOrdersModalList?.(filterEl?.value ?? '');
      win.renderStaffList?.();
      win.renderAttendanceForDate?.();
      win.renderProductionList?.();
      win.calculateSalaryReport?.();
      win.updateHeaderQuickFinanceSnapshot?.();
    } catch {
      // ignore iframe refresh edge case during initial load
    }
  }, []);

  const attachBillingIframeSyncHooks = useCallback(() => {
    const win = billingIframeRef.current?.contentWindow as BillingIframeWindow | null;
    if (!win || win.__deekshaFirebaseHooked) return;
    win.__deekshaFirebaseHooked = true;

    const origSaveOrders = win.saveOrders;
    if (typeof origSaveOrders === 'function') {
      win.saveOrders = () => {
        origSaveOrders();
        void ordersSyncRef.current?.pushLocalToCloud(false);
      };
    }

    const origSaveStaff = win.saveStaffData;
    if (typeof origSaveStaff === 'function') {
      win.saveStaffData = () => {
        origSaveStaff();
        void staffSyncRef.current?.pushLocalToCloud(false);
      };
    }

    const origSaveAttendance = win.saveAttendanceData;
    if (typeof origSaveAttendance === 'function') {
      win.saveAttendanceData = () => {
        origSaveAttendance();
        void attendanceSyncRef.current?.pushLocalToCloud(false);
      };
    }

    const origSaveProduction = win.saveProductionData;
    if (typeof origSaveProduction === 'function') {
      win.saveProductionData = () => {
        origSaveProduction();
        void productionSyncRef.current?.pushLocalToCloud(false);
      };
    }

    const wrapSingleDelete = (
      fnName: 'confirmDeleteOrder' | 'deleteStaffProfile' | 'deleteProductionEntry',
      getController: () => RtdbCollectionController<Record<string, unknown>> | null,
    ) => {
      const origFn = win[fnName];
      if (typeof origFn !== 'function') return;
      win[fnName] = (id: string) => {
        const origShowConfirm = win.showConfirm;
        if (typeof origShowConfirm === 'function') {
          win.showConfirm = (title, msg, icon, onConfirm) => {
            win.showConfirm = origShowConfirm;
            origShowConfirm(title, msg, icon, () => {
              onConfirm?.();
              void getController()?.deleteKeyFromCloud(id);
            });
          };
        }
        origFn(id);
      };
    };

    wrapSingleDelete('confirmDeleteOrder', () => ordersSyncRef.current);
    wrapSingleDelete('deleteStaffProfile', () => staffSyncRef.current);
    wrapSingleDelete('deleteProductionEntry', () => productionSyncRef.current);

    // Ensure freshly loaded iframe picks up any cloud data synced prior to iframe mount
    refreshBillingIframeFromStorage();
  }, [refreshBillingIframeFromStorage]);

  useEffect(() => {
    const ordersCtrl = createRtdbCollectionSync<Record<string, unknown>>({
      rtdbPath: 'orders',
      storageKey: BILLING_STORAGE_KEY,
      getKey: (item, idx) => String(item.id ?? `ord-${idx}`),
      onCloudApplied: refreshBillingIframeFromStorage,
      onSyncError: () => {
        // Keep local billing operational offline without disrupting admin entry
      },
    });
    const staffCtrl = createRtdbCollectionSync<Record<string, unknown>>({
      rtdbPath: 'staff',
      storageKey: STAFF_STORAGE_KEY,
      getKey: (item, idx) => String(item.id ?? `stf-${idx}`),
      onCloudApplied: refreshBillingIframeFromStorage,
    });
    const attendanceCtrl = createRtdbCollectionSync<Record<string, unknown>>({
      rtdbPath: 'attendance',
      storageKey: ATTENDANCE_STORAGE_KEY,
      getKey: (item, idx) =>
        item.date && item.staffId ? `${String(item.date)}_${String(item.staffId)}` : String(item.id ?? `att-${idx}`),
      onCloudApplied: refreshBillingIframeFromStorage,
    });
    const productionCtrl = createRtdbCollectionSync<Record<string, unknown>>({
      rtdbPath: 'production',
      storageKey: PRODUCTION_STORAGE_KEY,
      getKey: (item, idx) => String(item.id ?? `prd-${idx}`),
      onCloudApplied: refreshBillingIframeFromStorage,
    });

    ordersSyncRef.current = ordersCtrl;
    staffSyncRef.current = staffCtrl;
    attendanceSyncRef.current = attendanceCtrl;
    productionSyncRef.current = productionCtrl;

    return () => {
      ordersCtrl.stop();
      staffCtrl.stop();
      attendanceCtrl.stop();
      productionCtrl.stop();
      ordersSyncRef.current = null;
      staffSyncRef.current = null;
      attendanceSyncRef.current = null;
      productionSyncRef.current = null;
    };
  }, [refreshBillingIframeFromStorage]);

  const loadOverview = async () => {
    const headers = await getAdminHeaders();
    if (!headers.Authorization && !headers['X-Firebase-Id-Token']) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/overview', {
        headers,
      });
      if (res.status === 401) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        appointments: FittingAppointment[];
        reviews: CustomerReview[];
        shopDetails: ShopDetails;
        catalog: CatalogConfig;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || 'Could not load owner portal data.');
        return;
      }
      if (Array.isArray(data.appointments) && data.appointments.length > 0) {
        setAppointments((prev) => {
          const byId = new Map<string, FittingAppointment>();
          data.appointments.forEach((a) => byId.set(a.id, a));
          prev.forEach((a) => {
            if (!byId.has(a.id)) byId.set(a.id, a);
          });
          return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        });
      }
      if (Array.isArray(data.reviews) && data.reviews.length > 0) {
        baselineReviewsRef.current = data.reviews;
        setReviews((prev) => {
          const byId = new Map<string, CustomerReview>();
          data.reviews.forEach((r) => byId.set(r.id, r));
          prev.forEach((r) => {
            if (!byId.has(r.id)) byId.set(r.id, r);
          });
          return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        });
      }
      setShopForm({
        youtubeUrl: initialShopDetails.youtubeUrl ?? 'https://youtube.com/@deesufashiondesigner?si=NTjEtf-O3dJb6ocE',
        instagramUrl: initialShopDetails.instagramUrl ?? 'https://www.instagram.com/deesufashion?dlrf=aGRyaWttNWE0NnNy',
        facebookUrl: initialShopDetails.facebookUrl ?? 'https://www.facebook.com/deesuCollection',
        ...data.shopDetails,
      });
      setCatalog(data.catalog);
      const drafts: Record<string, string> = {};
      data.reviews.forEach((r) => {
        drafts[r.id] = r.ownerReply ?? '';
      });
      setReplyDrafts((prev) => ({ ...drafts, ...prev }));
    } catch {
      // Keep Firebase RTDB data active even if server endpoint is offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    const unsubAppointments = subscribeAppointmentsRtdb((cloudAppointments) => {
      setAppointments(cloudAppointments);
    });

    const unsubStorefront = subscribePublicStorefrontRtdb({
      getBaselineReviews: () => baselineReviewsRef.current,
      onReviewsUpdate: (cloudReviews) => {
        setReviews(cloudReviews);
        setReplyDrafts((prev) => {
          const next = { ...prev };
          cloudReviews.forEach((r) => {
            if (!(r.id in next)) {
              next[r.id] = r.ownerReply ?? '';
            }
          });
          return next;
        });
      },
      onShopDetailsUpdate: (cloudShop) => {
        setShopForm({
          youtubeUrl: initialShopDetails.youtubeUrl ?? 'https://youtube.com/@deesufashiondesigner?si=NTjEtf-O3dJb6ocE',
          instagramUrl: initialShopDetails.instagramUrl ?? 'https://www.instagram.com/deesufashion?dlrf=aGRyaWttNWE0NnNy',
          facebookUrl: initialShopDetails.facebookUrl ?? 'https://www.facebook.com/deesuCollection',
          ...cloudShop,
        });
      },
      onCatalogUpdate: (cloudCatalog) => {
        setCatalog(cloudCatalog);
      },
    });

    return () => {
      unsubAppointments();
      unsubStorefront();
    };
  }, []);

  const handleAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;
    const updated: FittingAppointment = { ...target, status };
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));

    try {
      const headers = await getAdminHeaders();
      const [rtdbOk, serverRes] = await Promise.all([
        saveAppointmentToRtdb(updated),
        fetch(`/api/admin/appointments/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status }),
        }).catch(() => null),
      ]);
      if (!rtdbOk && !serverRes?.ok) {
        setError('Could not update appointment.');
      }
    } catch {
      setError('Could not update appointment.');
    }
  };

  const handleReviewUpdate = async (
    id: string,
    payload: { visible?: boolean; featured?: boolean; ownerReply?: string },
  ) => {
    let updatedReview: CustomerReview | undefined;
    const nextReviews = reviews.map((r) => {
      if (r.id !== id) return r;
      const updated: CustomerReview = {
        ...r,
        ...(typeof payload.visible === 'boolean' ? { visible: payload.visible } : {}),
        ...(typeof payload.featured === 'boolean' ? { featured: payload.featured } : {}),
      };
      if (typeof payload.ownerReply === 'string') {
        const trimmedReply = payload.ownerReply.trim();
        if (trimmedReply) {
          updated.ownerReply = trimmedReply;
        } else {
          delete updated.ownerReply;
        }
      }
      updatedReview = updated;
      return updated;
    });

    baselineReviewsRef.current = nextReviews;
    setReviews(nextReviews);
    onReviewsUpdated(nextReviews);

    try {
      const headers = await getAdminHeaders();
      const [rtdbOk, serverRes] = await Promise.all([
        updatedReview ? publishReviewToRtdb(updatedReview) : Promise.resolve(false),
        fetch(`/api/admin/reviews/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        }).catch(() => null),
      ]);
      if (!rtdbOk && !serverRes?.ok) {
        setError('Could not update review.');
      }
    } catch {
      setError('Could not update review.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    const remaining = reviews.filter((r) => r.id !== id);
    baselineReviewsRef.current = remaining;
    setReviews(remaining);
    onReviewsUpdated(remaining);

    try {
      const headers = await getAdminHeaders();
      const [rtdbOk, serverRes] = await Promise.all([
        deleteReviewFromRtdb(id),
        fetch(`/api/admin/reviews/${id}`, {
          method: 'DELETE',
          headers,
        }).catch(() => null),
      ]);
      if (!rtdbOk && !serverRes?.ok) {
        setError('Could not delete review.');
      }
    } catch {
      setError('Could not delete review.');
    }
  };

  const handleSaveShopDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!shopForm) return;
    setError('');
    try {
      const headers = await getAdminHeaders();
      let finalShop = shopForm;
      let serverOk = false;
      try {
        const res = await fetch('/api/admin/shop', {
          method: 'PUT',
          headers,
          body: JSON.stringify(shopForm),
        });
        const data = (await res.json()) as { shopDetails?: ShopDetails };
        if (res.ok && data.shopDetails) {
          finalShop = data.shopDetails;
          serverOk = true;
        }
      } catch {
        // continue syncing to RTDB
      }
      const rtdbOk = await saveShopDetailsToRtdb(finalShop);
      if (!rtdbOk && !serverOk) {
        setError('Could not save shop details. Please check your connection and try again.');
        return;
      }
      setShopForm(finalShop);
      onShopUpdated(finalShop);
    } catch {
      setError('Error saving shop details.');
    }
  };

  const handleSaveCatalog = async (nextCatalog: CatalogConfig) => {
    setError('');
    setSavingCatalog(true);
    try {
      const headers = await getAdminHeaders();
      let finalCatalog = nextCatalog;
      let serverOk = false;
      try {
        const res = await fetch('/api/admin/catalog', {
          method: 'PUT',
          headers,
          body: JSON.stringify(nextCatalog),
        });
        const data = (await res.json()) as { catalog?: CatalogConfig; error?: string };
        if (res.ok && data.catalog) {
          finalCatalog = data.catalog;
          serverOk = true;
        }
      } catch {
        // continue syncing to RTDB
      }
      const rtdbOk = await saveCatalogToRtdb(finalCatalog);
      if (!rtdbOk && !serverOk) {
        setError('Could not save prices & services. Please sign in again and retry.');
        return;
      }
      setCatalog(finalCatalog);
      onCatalogUpdated(finalCatalog);
    } catch {
      setError('Error saving pricing and services.');
    } finally {
      setSavingCatalog(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF8F6] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-stone-200 p-4 sm:p-5 flex flex-col justify-between gap-6 shrink-0">
        <div className="space-y-4">
          <div className="px-2 flex items-center gap-3">
            <img
              src="/assets/aistudio/1794735885525_5eb76f5f.png"
              alt="Deeksha Ladies Tailors & Matching Center logo"
              className="w-11 h-11 object-contain rounded-xl border border-stone-200 bg-[#FAF8F6] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs text-stone-500">Signed in as</p>
              <p className="text-sm font-semibold text-stone-950 truncate">{authUser.ownerName}</p>
              <p className="font-mono-tabular text-[11px] text-stone-500 truncate">{authUser.businessId}</p>
            </div>
          </div>

          <nav aria-label="Owner Portal Sections" className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">

            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Billing Software</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Appointments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Scissors className="w-4 h-4 shrink-0" />
              <span>Services &amp; Pricing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Star className="w-4 h-4 shrink-0" />
              <span>Reviews &amp; Google</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Shop &amp; Account</span>
            </button>
          </nav>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs sm:text-sm font-semibold text-stone-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Admin Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-4 sm:p-8 space-y-6 ${activeTab === 'billing' ? 'max-w-full' : 'max-w-[1160px]'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs text-stone-500">
              Admin Dashboard /{' '}
              {activeTab === 'catalog'
                ? 'Services & Pricing'
                : activeTab === 'billing'
                  ? 'Billing & Workshop'
                  : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-stone-950">
              {activeTab === 'billing' && 'Billing, Measurements & Staff Software'}
              {activeTab === 'appointments' && 'Customer Fitting Appointments'}
              {activeTab === 'catalog' && 'Services, Prices & Cost Estimator'}
              {activeTab === 'reviews' && 'Customer Reviews & Google Profile'}
              {activeTab === 'settings' && 'Shop Details, Map Links & Firebase Admin'}
            </h1>
          </div>

          {activeTab === 'billing' && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setBillingReloadKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload</span>
              </button>
              {!billingExpanded && (
                <button
                  type="button"
                  onClick={() => setBillingExpanded(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Full Screen View</span>
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm font-medium text-rose-900">
            {error}
          </div>
        )}

        {/* KPI strip (hidden inside full-height embedded billing app) */}
        {activeTab !== 'billing' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs text-stone-500">Fitting Requests</p>
              <p className="font-mono-tabular text-2xl font-semibold text-stone-950 mt-1">{appointments.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs text-stone-500">Pending Fittings</p>
              <p className="font-mono-tabular text-2xl font-semibold text-rose-800 mt-1">
                {appointments.filter((a) => a.status === 'Pending').length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs text-stone-500">Catalog Services</p>
              <p className="font-mono-tabular text-2xl font-semibold text-stone-950 mt-1">
                {catalog?.services.length ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs text-stone-500">Visible Reviews</p>
              <p className="font-mono-tabular text-2xl font-semibold text-emerald-700 mt-1">
                {reviews.filter((r) => r.visible).length}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-sm text-stone-500">
            Loading boutique records...
          </div>
        ) : (
          <>

            {/* BILLING SOFTWARE (EXACT UPLOADED HTML) TAB */}
            {activeTab === 'billing' && (
              <div
                className={
                  billingExpanded
                    ? 'fixed inset-0 z-50 bg-white flex flex-col'
                    : 'bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs flex flex-col'
                }
              >
                {billingExpanded && (
                  <div className="px-4 py-2.5 bg-stone-950 text-white flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-semibold">
                      Deeksha Billing, Measurements &amp; Staff Register
                    </span>
                    <button
                      type="button"
                      onClick={() => setBillingExpanded(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-950 hover:bg-stone-100 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Exit Full View</span>
                    </button>
                  </div>
                )}
                <iframe
                  ref={billingIframeRef}
                  key={billingReloadKey}
                  src={BILLING_HTML_PATH}
                  onLoad={attachBillingIframeSyncHooks}
                  title="Deeksha Ladies Tailors Billing & Measurement Software"
                  className={
                    billingExpanded
                      ? 'w-full flex-1 border-0 bg-white'
                      : 'w-full h-[calc(100vh-14rem)] min-h-[760px] border-0 bg-white'
                  }
                />
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-200">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-stone-950">{apt.name}</span>
                        <span aria-hidden="true" className="text-stone-400">·</span>
                        <span className="font-mono-tabular text-stone-700">+91 {apt.phone}</span>
                        <span aria-hidden="true" className="text-stone-400">·</span>
                        <span className="text-xs text-stone-500">
                          {apt.preferredDate} · {apt.timeSlot}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">{apt.notes}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <select
                        aria-label={`Appointment status for ${apt.name}`}
                        value={apt.status}
                        onChange={(e) => void handleAppointmentStatus(apt.id, e.target.value as AppointmentStatus)}
                        className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-medium bg-white"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <a
                        href={`https://api.whatsapp.com/send?phone=91${apt.phone}&text=${encodeURIComponent(
                          `Hello ${apt.name}, your fitting slot at Deeksha Ladies Tailor (${apt.preferredDate}, ${apt.timeSlot}) is confirmed.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800 whitespace-nowrap"
                      >
                        WhatsApp Customer
                      </a>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <div className="p-8 text-center text-sm text-stone-500">
                    No fitting appointments booked yet.
                  </div>
                )}
              </div>
            )}

            {/* CATALOG & PRICING TAB */}
            {activeTab === 'catalog' && catalog && (
              <CatalogEditorTab
                catalog={catalog}
                saving={savingCatalog}
                onSaveCatalog={handleSaveCatalog}
              />
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-semibold text-stone-950">{rev.customerName}</span>
                        <span className="mx-2 text-stone-400">·</span>
                        <span className="text-xs text-stone-600">
                          {rev.service} · {rev.source} · {rev.rating}.0 ★
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReviewUpdate(rev.id, { visible: !rev.visible })}
                          className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 hover:bg-stone-50"
                        >
                          {rev.visible ? 'Hide from Site' : 'Show on Site'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteReview(rev.id)}
                          aria-label={`Delete review by ${rev.customerName}`}
                          className="p-1.5 text-stone-400 hover:text-rose-700 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-stone-700">“{rev.comment}”</p>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-100">
                      <input
                        type="text"
                        aria-label={`Owner reply to ${rev.customerName}`}
                        value={replyDrafts[rev.id] ?? ''}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))}
                        placeholder="Write a shop reply to display beneath this review..."
                        className="flex-1 px-3 py-1.5 border border-stone-300 rounded-lg text-xs outline-none focus:border-rose-800"
                      />
                      <button
                        type="button"
                        onClick={() => void handleReviewUpdate(rev.id, { ownerReply: replyDrafts[rev.id] ?? '' })}
                        className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap"
                      >
                        Save Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SETTINGS & CREDENTIALS TAB */}
            {activeTab === 'settings' && shopForm && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={(e) => void handleSaveShopDetails(e)}
                  className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 space-y-4"
                >
                  <h2 className="text-base font-semibold text-stone-950 border-b border-stone-200 pb-3">
                    Shop Details &amp; Google Links
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shop-name" className="block text-xs font-semibold text-stone-700 mb-1">
                        Business Name
                      </label>
                      <input
                        id="shop-name"
                        type="text"
                        value={shopForm.businessName}
                        onChange={(e) => setShopForm({ ...shopForm, businessName: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                        Display Phone
                      </label>
                      <input
                        id="shop-phone"
                        type="text"
                        value={shopForm.phone}
                        onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="shop-tagline" className="block text-xs font-semibold text-stone-700 mb-1">
                      Tagline
                    </label>
                    <input
                      id="shop-tagline"
                      type="text"
                      value={shopForm.tagline}
                      onChange={(e) => setShopForm({ ...shopForm, tagline: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="shop-address" className="block text-xs font-semibold text-stone-700 mb-1">
                      Street Address
                    </label>
                    <input
                      id="shop-address"
                      type="text"
                      value={shopForm.address}
                      onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="shop-landmark" className="block text-xs font-semibold text-stone-700 mb-1">
                        Landmark
                      </label>
                      <input
                        id="shop-landmark"
                        type="text"
                        value={shopForm.landmark}
                        onChange={(e) => setShopForm({ ...shopForm, landmark: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-city" className="block text-xs font-semibold text-stone-700 mb-1">
                        City / Locality
                      </label>
                      <input
                        id="shop-city"
                        type="text"
                        value={shopForm.city}
                        onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-pincode" className="block text-xs font-semibold text-stone-700 mb-1">
                        Pincode
                      </label>
                      <input
                        id="shop-pincode"
                        type="text"
                        value={shopForm.pincode}
                        onChange={(e) => setShopForm({ ...shopForm, pincode: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="shop-hours" className="block text-xs font-semibold text-stone-700 mb-1">
                        Shop Hours
                      </label>
                      <input
                        id="shop-hours"
                        type="text"
                        value={shopForm.hours}
                        onChange={(e) => setShopForm({ ...shopForm, hours: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-wa" className="block text-xs font-semibold text-stone-700 mb-1">
                        WhatsApp Digits (with 91)
                      </label>
                      <input
                        id="shop-wa"
                        type="text"
                        value={shopForm.whatsappDigits}
                        onChange={(e) => setShopForm({ ...shopForm, whatsappDigits: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-rating" className="block text-xs font-semibold text-stone-700 mb-1">
                        Base Rating (1.0 – 5.0)
                      </label>
                      <input
                        id="shop-rating"
                        type="number"
                        step="0.1"
                        min={1}
                        max={5}
                        value={shopForm.baseDirectoryRating}
                        onChange={(e) =>
                          setShopForm({ ...shopForm, baseDirectoryRating: Number(e.target.value) || 4.8 })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shop-google-url" className="block text-xs font-semibold text-stone-700 mb-1">
                        Google Business Share Link
                      </label>
                      <input
                        id="shop-google-url"
                        type="url"
                        value={shopForm.googleBusinessUrl}
                        onChange={(e) => setShopForm({ ...shopForm, googleBusinessUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-maps-url" className="block text-xs font-semibold text-stone-700 mb-1">
                        Google Maps Link
                      </label>
                      <input
                        id="shop-maps-url"
                        type="url"
                        value={shopForm.googleMapsUrl}
                        onChange={(e) => setShopForm({ ...shopForm, googleMapsUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="shop-youtube-url" className="block text-xs font-semibold text-stone-700 mb-1">
                        YouTube URL
                      </label>
                      <input
                        id="shop-youtube-url"
                        type="url"
                        value={shopForm.youtubeUrl ?? ''}
                        onChange={(e) => setShopForm({ ...shopForm, youtubeUrl: e.target.value })}
                        placeholder="https://youtube.com/..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-instagram-url" className="block text-xs font-semibold text-stone-700 mb-1">
                        Instagram URL
                      </label>
                      <input
                        id="shop-instagram-url"
                        type="url"
                        value={shopForm.instagramUrl ?? ''}
                        onChange={(e) => setShopForm({ ...shopForm, instagramUrl: e.target.value })}
                        placeholder="https://www.instagram.com/..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="shop-facebook-url" className="block text-xs font-semibold text-stone-700 mb-1">
                        Facebook URL
                      </label>
                      <input
                        id="shop-facebook-url"
                        type="url"
                        value={shopForm.facebookUrl ?? ''}
                        onChange={(e) => setShopForm({ ...shopForm, facebookUrl: e.target.value })}
                        placeholder="https://www.facebook.com/..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="shop-announcement" className="block text-xs font-semibold text-stone-700 mb-1">
                      Top Announcement Banner
                    </label>
                    <input
                      id="shop-announcement"
                      type="text"
                      value={shopForm.announcement}
                      onChange={(e) => setShopForm({ ...shopForm, announcement: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-sm font-semibold"
                    >
                      Save Shop Details
                    </button>
                  </div>
                </form>

                <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 space-y-4 h-fit">
                  <h2 className="text-base font-semibold text-stone-950 border-b border-stone-200 pb-3">
                    Firebase Admin Authentication
                  </h2>
                  <div className="space-y-2 text-sm text-stone-700">
                    <div>
                      <span className="text-xs text-stone-500 block">Signed-in Admin Email</span>
                      <span className="font-mono-tabular font-semibold text-stone-950">
                        {firebaseAuth.currentUser?.email || authUser.businessId}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 block">Firebase Project</span>
                      <span className="font-mono-tabular text-xs text-stone-700">deeksha-ladies-tailors</span>
                    </div>
                    <p className="text-xs text-stone-600 pt-1">
                      Orders, staff, attendance, and production logs sync live across devices via Firebase Realtime Database. Admin accounts and passwords are managed in Firebase Authentication.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Admin Logout</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
