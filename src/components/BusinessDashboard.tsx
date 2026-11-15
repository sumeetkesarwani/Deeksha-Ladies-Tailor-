import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Calendar,
  ClipboardList,
  LogOut,
  Plus,
  Scissors,
  Search,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import type {
  AppointmentStatus,
  AuthUser,
  CatalogConfig,
  CustomerReview,
  FittingAppointment,
  OrderStatus,
  ReviewSummary,
  ShopDetails,
  TailoringOrder,
} from '../types.ts';
import { filterOrders, formatCurrencyINR } from '../utils/tailoring.ts';
import { CatalogEditorTab } from './CatalogEditorTab.tsx';

interface BusinessDashboardProps {
  authUser: AuthUser;
  authToken: string;
  onLogout: () => void;
  onShopUpdated: (shopDetails: ShopDetails) => void;
  onCatalogUpdated: (catalog: CatalogConfig) => void;
  onReviewsUpdated: (reviews: CustomerReview[], summary: ReviewSummary) => void;
  onCredentialsUpdated: (user: AuthUser, token: string) => void;
}

type AdminTab = 'orders' | 'appointments' | 'catalog' | 'reviews' | 'settings';

export function BusinessDashboard({
  authUser,
  authToken,
  onLogout,
  onShopUpdated,
  onCatalogUpdated,
  onReviewsUpdated,
  onCredentialsUpdated,
}: BusinessDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [loading, setLoading] = useState(true);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [orders, setOrders] = useState<TailoringOrder[]>([]);
  const [appointments, setAppointments] = useState<FittingAppointment[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [shopForm, setShopForm] = useState<ShopDetails | null>(null);
  const [catalog, setCatalog] = useState<CatalogConfig | null>(null);

  // Order filter & creation
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newBillNo, setNewBillNo] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newTotal, setNewTotal] = useState(450);
  const [newAdvance, setNewAdvance] = useState(200);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('Booked');

  // Review reply editing
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Credentials update form
  const [credCurrentPassword, setCredCurrentPassword] = useState('');
  const [credNewBusinessId, setCredNewBusinessId] = useState(authUser.businessId);
  const [credNewPassword, setCredNewPassword] = useState('');
  const [credOwnerName, setCredOwnerName] = useState(authUser.ownerName);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    }),
    [authToken],
  );

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = (await res.json()) as {
        orders: TailoringOrder[];
        appointments: FittingAppointment[];
        reviews: CustomerReview[];
        shopDetails: ShopDetails;
        catalog: CatalogConfig;
        reviewSummary: ReviewSummary;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || 'Could not load owner portal data.');
        return;
      }
      setOrders(data.orders);
      setAppointments(data.appointments);
      setReviews(data.reviews);
      setShopForm(data.shopDetails);
      setCatalog(data.catalog);
      const drafts: Record<string, string> = {};
      data.reviews.forEach((r) => {
        drafts[r.id] = r.ownerReply ?? '';
      });
      setReplyDrafts(drafts);
    } catch {
      setError('Unable to reach server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const filteredOrders = useMemo(
    () => filterOrders(orders, orderQuery, orderStatusFilter),
    [orders, orderQuery, orderStatusFilter],
  );

  const pendingBalanceTotal = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.balance) || 0), 0),
    [orders],
  );

  const readyCount = useMemo(
    () => orders.filter((o) => o.status === 'Ready').length,
    [orders],
  );

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          orderNo: newBillNo,
          customerName: newCustName,
          phone: newCustPhone,
          itemDesc: newItemDesc,
          qty: newQty,
          totalAmount: newTotal,
          advancePaid: newAdvance,
          deliveryDate: newDeliveryDate || 'Within 4–5 Days',
          status: newOrderStatus,
        }),
      });
      const data = (await res.json()) as { order?: TailoringOrder; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || 'Failed to add tailoring order.');
        return;
      }
      setOrders((prev) => [data.order!, ...prev]);
      setNewBillNo('');
      setNewCustName('');
      setNewCustPhone('');
      setNewItemDesc('');
      setNewQty(1);
      setNewTotal(450);
      setNewAdvance(200);
      setNewDeliveryDate('');
      setShowNewOrder(false);
      flashNotice(`Bill #${data.order.orderNo} created and live in Order Tracker.`);
    } catch {
      setError('Failed to save order.');
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { order?: TailoringOrder };
      if (res.ok && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order! : o)));
        flashNotice(`Bill #${data.order.orderNo} marked ${status}.`);
      }
    } catch {
      setError('Could not update order status.');
    }
  };

  const handleMarkPaid = async (order: TailoringOrder) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ advancePaid: order.totalAmount }),
      });
      const data = (await res.json()) as { order?: TailoringOrder };
      if (res.ok && data.order) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order! : o)));
        flashNotice(`Bill #${order.orderNo} balance cleared.`);
      }
    } catch {
      setError('Could not update payment.');
    }
  };

  const handleDeleteOrder = async (order: TailoringOrder) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        flashNotice(`Bill #${order.orderNo} removed.`);
      }
    } catch {
      setError('Could not delete order.');
    }
  };

  const handleAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { appointment?: FittingAppointment };
      if (res.ok && data.appointment) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? data.appointment! : a)));
        flashNotice(`Appointment updated to ${status}.`);
      }
    } catch {
      setError('Could not update appointment.');
    }
  };

  const syncPublicReviews = async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (res.ok) {
        const data = (await res.json()) as { reviews: CustomerReview[]; reviewSummary: ReviewSummary };
        onReviewsUpdated(data.reviews, data.reviewSummary);
      }
    } catch {
      // ignore background sync error
    }
  };

  const handleReviewUpdate = async (
    id: string,
    payload: { visible?: boolean; featured?: boolean; ownerReply?: string },
  ) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { review?: CustomerReview };
      if (res.ok && data.review) {
        setReviews((prev) => prev.map((r) => (r.id === id ? data.review! : r)));
        await syncPublicReviews();
        flashNotice('Review updated.');
      }
    } catch {
      setError('Could not update review.');
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        await syncPublicReviews();
        flashNotice('Review deleted.');
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
      const res = await fetch('/api/admin/shop', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(shopForm),
      });
      const data = (await res.json()) as { shopDetails?: ShopDetails; error?: string };
      if (!res.ok || !data.shopDetails) {
        setError(data.error || 'Could not update shop details.');
        return;
      }
      setShopForm(data.shopDetails);
      onShopUpdated(data.shopDetails);
      await syncPublicReviews();
      flashNotice('Shop details & Google links updated.');
    } catch {
      setError('Network error saving shop details.');
    }
  };

  const handleSaveCatalog = async (nextCatalog: CatalogConfig) => {
    setError('');
    setSavingCatalog(true);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(nextCatalog),
      });
      const data = (await res.json()) as { catalog?: CatalogConfig; error?: string };
      if (!res.ok || !data.catalog) {
        setError(data.error || 'Could not update services & pricing.');
        return;
      }
      setCatalog(data.catalog);
      onCatalogUpdated(data.catalog);
      flashNotice('All services, estimator prices, and rates updated live.');
    } catch {
      setError('Network error saving pricing and services.');
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleUpdateCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/credentials', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword: credCurrentPassword,
          newBusinessId: credNewBusinessId,
          newPassword: credNewPassword || undefined,
          ownerName: credOwnerName,
        }),
      });
      const data = (await res.json()) as { user?: AuthUser; token?: string; error?: string };
      if (!res.ok || !data.user || !data.token) {
        setError(data.error || 'Could not update login credentials.');
        return;
      }
      onCredentialsUpdated(data.user, data.token);
      setCredCurrentPassword('');
      setCredNewPassword('');
      flashNotice('Business Login ID & password updated.');
    } catch {
      setError('Network error updating credentials.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF8F6] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-stone-200 p-4 sm:p-5 flex flex-col justify-between gap-6 shrink-0">
        <div className="space-y-4">
          <div className="px-2">
            <p className="text-xs text-stone-500">Signed in as</p>
            <p className="text-sm font-semibold text-stone-950 truncate">{authUser.ownerName}</p>
            <p className="font-mono-tabular text-xs text-stone-500 truncate">ID: {authUser.businessId}</p>
          </div>

          <nav aria-label="Owner Portal Sections" className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Orders &amp; Bills</span>
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
              <span>Shop &amp; Login ID</span>
            </button>
          </nav>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs sm:text-sm font-semibold text-stone-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-[1160px] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs text-stone-500">
              Owner Portal / {activeTab === 'catalog' ? 'Services & Pricing' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-stone-950">
              {activeTab === 'orders' && 'Tailoring Orders & Billing'}
              {activeTab === 'appointments' && 'Customer Fitting Appointments'}
              {activeTab === 'catalog' && 'Services, Prices & Cost Estimator'}
              {activeTab === 'reviews' && 'Customer Reviews & Google Profile'}
              {activeTab === 'settings' && 'Shop Details, Map Links & Login'}
            </h1>
          </div>

          {activeTab === 'orders' && (
            <button
              type="button"
              onClick={() => setShowNewOrder((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showNewOrder ? 'Close Order Form' : 'New Tailoring Bill'}</span>
            </button>
          )}
        </div>

        {notice && (
          <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900">
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm font-medium text-rose-900">
            {error}
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Active &amp; Logged Bills</p>
            <p className="font-mono-tabular text-2xl font-semibold text-stone-950 mt-1">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Ready for Pickup</p>
            <p className="font-mono-tabular text-2xl font-semibold text-emerald-700 mt-1">{readyCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Pending Balance</p>
            <p className="font-mono-tabular text-2xl font-semibold text-rose-800 mt-1">
              {formatCurrencyINR(pendingBalanceTotal)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">Fitting Requests</p>
            <p className="font-mono-tabular text-2xl font-semibold text-stone-950 mt-1">{appointments.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-sm text-stone-500">
            Loading boutique records...
          </div>
        ) : (
          <>
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                {showNewOrder && (
                  <form onSubmit={(e) => void handleCreateOrder(e)} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-stone-950">Create New Customer Bill</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="new-bill-no" className="block text-xs font-semibold text-stone-700 mb-1">
                          Bill No. (Optional)
                        </label>
                        <input
                          id="new-bill-no"
                          type="text"
                          value={newBillNo}
                          onChange={(e) => setNewBillNo(e.target.value)}
                          placeholder="Auto (e.g. 104)"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-cust-name" className="block text-xs font-semibold text-stone-700 mb-1">
                          Customer Name *
                        </label>
                        <input
                          id="new-cust-name"
                          type="text"
                          required
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="e.g. Arpita Roy"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-cust-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                          10-Digit Mobile *
                        </label>
                        <input
                          id="new-cust-phone"
                          type="tel"
                          required
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="e.g. 9831299999"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="new-item-desc" className="block text-xs font-semibold text-stone-700 mb-1">
                          Garment Description *
                        </label>
                        <input
                          id="new-item-desc"
                          type="text"
                          required
                          value={newItemDesc}
                          onChange={(e) => setNewItemDesc(e.target.value)}
                          placeholder="e.g. Prince Cut Blouse + Cotton Astar"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-qty" className="block text-xs font-semibold text-stone-700 mb-1">
                          Qty
                        </label>
                        <input
                          id="new-qty"
                          type="number"
                          min={1}
                          value={newQty}
                          onChange={(e) => setNewQty(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-delivery-date" className="block text-xs font-semibold text-stone-700 mb-1">
                          Delivery Date
                        </label>
                        <input
                          id="new-delivery-date"
                          type="date"
                          value={newDeliveryDate}
                          onChange={(e) => setNewDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="new-total" className="block text-xs font-semibold text-stone-700 mb-1">
                          Total Amount (₹)
                        </label>
                        <input
                          id="new-total"
                          type="number"
                          min={0}
                          value={newTotal}
                          onChange={(e) => setNewTotal(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-advance" className="block text-xs font-semibold text-stone-700 mb-1">
                          Advance Paid (₹)
                        </label>
                        <input
                          id="new-advance"
                          type="number"
                          min={0}
                          value={newAdvance}
                          onChange={(e) => setNewAdvance(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-status" className="block text-xs font-semibold text-stone-700 mb-1">
                          Initial Status
                        </label>
                        <select
                          id="new-status"
                          value={newOrderStatus}
                          onChange={(e) => setNewOrderStatus(e.target.value as OrderStatus)}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:border-rose-800"
                        >
                          <option value="Booked">Booked</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Ready">Ready</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNewOrder(false)}
                        className="px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-sm font-semibold"
                      >
                        Save Order
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        aria-label="Filter orders by bill, customer name, or phone"
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        placeholder="Search bill #, name, or phone..."
                        className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg">
                      {(['All', 'Booked', 'In Progress', 'Ready', 'Delivered'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setOrderStatusFilter(status)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            orderStatusFilter === status ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-stone-200 text-xs text-stone-500 bg-stone-50">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Bill #</th>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Garments</th>
                          <th className="py-3 px-4 font-semibold text-right">Total</th>
                          <th className="py-3 px-4 font-semibold text-right">Balance</th>
                          <th className="py-3 px-4 font-semibold">Delivery</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-stone-50/70">
                            <td className="py-3 px-4 font-mono-tabular font-semibold text-stone-950">#{order.orderNo}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-stone-900">{order.customerName}</div>
                              <div className="font-mono-tabular text-xs text-stone-500">{order.phone}</div>
                            </td>
                            <td className="py-3 px-4 text-xs text-stone-700 max-w-xs">
                              {order.items.map((it) => `${it.desc} (×${it.qty})`).join(', ')}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-tabular text-stone-900">
                              {formatCurrencyINR(order.totalAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-tabular">
                              <span className={order.balance <= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-800 font-semibold'}>
                                {order.balance <= 0 ? 'Cleared' : formatCurrencyINR(order.balance)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono-tabular text-xs text-stone-700">{order.deliveryDate}</td>
                            <td className="py-3 px-4">
                              <select
                                aria-label={`Status for Bill #${order.orderNo}`}
                                value={order.status}
                                onChange={(e) => void handleOrderStatusChange(order.id, e.target.value as OrderStatus)}
                                className="px-2.5 py-1 border border-stone-300 rounded-md text-xs font-medium bg-white outline-none focus:border-rose-800"
                              >
                                <option value="Booked">Booked</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Ready">Ready</option>
                                <option value="Delivered">Delivered</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                {order.balance > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => void handleMarkPaid(order)}
                                    className="px-2.5 py-1 border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-md text-xs font-semibold whitespace-nowrap"
                                  >
                                    Clear Due
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteOrder(order)}
                                  aria-label={`Delete Bill #${order.orderNo}`}
                                  className="p-1.5 text-stone-400 hover:text-rose-700 rounded-md"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-sm text-stone-500">
                              No orders match this search or status filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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

                <form
                  onSubmit={(e) => void handleUpdateCredentials(e)}
                  className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 space-y-4 h-fit"
                >
                  <h2 className="text-base font-semibold text-stone-950 border-b border-stone-200 pb-3">
                    Business Login ID &amp; Password
                  </h2>

                  <div>
                    <label htmlFor="cred-owner-name" className="block text-xs font-semibold text-stone-700 mb-1">
                      Owner Display Name
                    </label>
                    <input
                      id="cred-owner-name"
                      type="text"
                      value={credOwnerName}
                      onChange={(e) => setCredOwnerName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="cred-business-id" className="block text-xs font-semibold text-stone-700 mb-1">
                      Business Login ID
                    </label>
                    <input
                      id="cred-business-id"
                      type="text"
                      required
                      value={credNewBusinessId}
                      onChange={(e) => setCredNewBusinessId(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="cred-current-pw" className="block text-xs font-semibold text-stone-700 mb-1">
                      Current Password *
                    </label>
                    <input
                      id="cred-current-pw"
                      type="password"
                      required
                      value={credCurrentPassword}
                      onChange={(e) => setCredCurrentPassword(e.target.value)}
                      placeholder="Required to confirm changes"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="cred-new-pw" className="block text-xs font-semibold text-stone-700 mb-1">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      id="cred-new-pw"
                      type="password"
                      value={credNewPassword}
                      onChange={(e) => setCredNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold"
                  >
                    Update Business Credentials
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
