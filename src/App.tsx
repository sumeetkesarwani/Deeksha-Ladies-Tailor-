import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { authPersistenceReady, firebaseAuth } from './firebase.ts';
import type {
  AuthUser,
  CatalogConfig,
  CustomerReview,
  PublicBootstrapPayload,
  ShopDetails,
} from './types.ts';
import { DEFAULT_CATALOG, computeReviewSummary } from './utils/tailoring.ts';
import {
  isAdminShortcutHash,
  resolveAdminShortcutScreen,
  stripAdminHashFromUrl,
} from './utils/adminRouting.ts';
import { subscribePublicStorefrontRtdb } from './utils/firebaseRtdb.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ServicesAndCatalog } from './components/ServicesAndCatalog.tsx';
import { MatchingCenterSection } from './components/MatchingCenterSection.tsx';
import { CostEstimatorSection } from './components/CostEstimatorSection.tsx';
import { ReviewsSection } from './components/ReviewsSection.tsx';
import { AppointmentAndLocationSection } from './components/AppointmentAndLocationSection.tsx';
import { BusinessLoginModal } from './components/BusinessLoginModal.tsx';
import { BusinessDashboard } from './components/BusinessDashboard.tsx';

const TOKEN_STORAGE_KEY = 'deeksha_owner_token_v1';

const FALLBACK_SHOP: ShopDetails = {
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
};

const FALLBACK_REVIEWS: CustomerReview[] = [
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
];

export default function App() {
  const [shopDetails, setShopDetails] = useState<ShopDetails>(FALLBACK_SHOP);
  const [catalog, setCatalog] = useState<CatalogConfig>(DEFAULT_CATALOG);
  const [reviews, setReviews] = useState<CustomerReview[]>(FALLBACK_REVIEWS);
  const baselineReviewsRef = useRef<CustomerReview[]>(FALLBACK_REVIEWS);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminHash, setIsAdminHash] = useState<boolean>(() => isAdminShortcutHash(window.location.hash));
  const isAdminHashRef = useRef<boolean>(isAdminHash);
  const [authResolved, setAuthResolved] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'public' | 'dashboard'>('public');
  const cloudShopLoadedRef = useRef(false);
  const cloudCatalogLoadedRef = useRef(false);

  const reviewSummary = useMemo(
    () =>
      computeReviewSummary(
        reviews,
        shopDetails.baseDirectoryRating,
        shopDetails.baseDirectoryReviewCount,
        shopDetails.googleBusinessUrl,
      ),
    [reviews, shopDetails],
  );

  // Only load public storefront data when visiting the public storefront or after Admin is authenticated
  const shouldLoadStorefrontData = !isAdminHash || Boolean(authUser);

  useEffect(() => {
    if (!shouldLoadStorefrontData) {
      return;
    }

    const loadPublic = async () => {
      try {
        const res = await fetch('/api/public/bootstrap', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as PublicBootstrapPayload;
        if (!cloudShopLoadedRef.current && data.shopDetails) {
          setShopDetails({
            ...FALLBACK_SHOP,
            ...data.shopDetails,
            youtubeUrl: data.shopDetails.youtubeUrl ?? FALLBACK_SHOP.youtubeUrl,
            instagramUrl: data.shopDetails.instagramUrl ?? FALLBACK_SHOP.instagramUrl,
            facebookUrl: data.shopDetails.facebookUrl ?? FALLBACK_SHOP.facebookUrl,
          });
        }
        if (!cloudCatalogLoadedRef.current && data.catalog) {
          setCatalog(data.catalog);
        }
        if (Array.isArray(data.reviews) && data.reviews.length > 0) {
          const byId = new Map<string, CustomerReview>();
          baselineReviewsRef.current.forEach((r) => byId.set(r.id, r));
          data.reviews.forEach((r) => byId.set(r.id, r));
          baselineReviewsRef.current = Array.from(byId.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
          setReviews((prev) => {
            const merged = new Map<string, CustomerReview>();
            data.reviews.forEach((r) => merged.set(r.id, r));
            prev.forEach((r) => {
              if (!merged.has(r.id)) merged.set(r.id, r);
            });
            return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          });
        }
      } catch {
        // Keep fallback shop details if offline
      }
    };

    void loadPublic();
    const pollInterval = window.setInterval(() => {
      void loadPublic();
    }, 15000);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void loadPublic();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const unsubStorefront = subscribePublicStorefrontRtdb({
      getBaselineReviews: () => baselineReviewsRef.current,
      onReviewsUpdate: (mergedReviews) => {
        setReviews(mergedReviews);
      },
      onShopDetailsUpdate: (cloudShop) => {
        cloudShopLoadedRef.current = true;
        setShopDetails({
          ...FALLBACK_SHOP,
          ...cloudShop,
          youtubeUrl: cloudShop.youtubeUrl ?? FALLBACK_SHOP.youtubeUrl,
          instagramUrl: cloudShop.instagramUrl ?? FALLBACK_SHOP.instagramUrl,
          facebookUrl: cloudShop.facebookUrl ?? FALLBACK_SHOP.facebookUrl,
        });
      },
      onCatalogUpdate: (cloudCatalog) => {
        cloudCatalogLoadedRef.current = true;
        setCatalog(cloudCatalog);
      },
    });

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      unsubStorefront();
    };
  }, [shouldLoadStorefrontData]);

  useEffect(() => {
    let active = true;
    let unsubscribeAuth = () => {};

    const handleHashChange = () => {
      const nextIsAdmin = isAdminShortcutHash(window.location.hash);
      isAdminHashRef.current = nextIsAdmin;
      setIsAdminHash(nextIsAdmin);
      if (nextIsAdmin && firebaseAuth.currentUser) {
        setActiveView('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    void authPersistenceReady.then(() => {
      if (!active) return;
      unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (!active) return;
        if (!fbUser) {
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            // ignore storage error
          }
          setAuthUser(null);
          setAuthToken('');
          setActiveView('public');
          setAuthResolved(true);
          return;
        }

        const fallbackUser: AuthUser = {
          businessId: fbUser.email || fbUser.uid,
          ownerName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Deeksha Admin',
        };
        setAuthUser(fallbackUser);
        setAuthResolved(true);
        if (isAdminHashRef.current) {
          setActiveView('dashboard');
        }

        try {
          const idToken = await fbUser.getIdToken();
          const res = await fetch('/api/auth/firebase-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (res.ok) {
            const data = (await res.json()) as { token?: string; user?: AuthUser };
            if (data.token) {
              try {
                localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
              } catch {
                // ignore storage error
              }
              setAuthToken(data.token);
            }
            if (data.user) {
              setAuthUser(data.user);
            }
          }
        } catch {
          // Firebase Auth remains valid for Billing & RTDB even if backend session bridge fails
        }
      });
    });

    return () => {
      active = false;
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribeAuth();
    };
  }, []);

  const clearAdminShortcutHash = () => {
    isAdminHashRef.current = false;
    setIsAdminHash(false);
    if (isAdminShortcutHash(window.location.hash)) {
      window.history.replaceState(null, '', stripAdminHashFromUrl(window.location));
    }
  };

  const handleNavigateView = (view: 'public' | 'dashboard') => {
    if (view === 'public') {
      clearAdminShortcutHash();
    }
    setActiveView(view);
  };

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    if (token) {
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } catch {
        // ignore storage error
      }
      setAuthToken(token);
    }
    setAuthUser(user);
    setAuthResolved(true);
    setLoginModalOpen(false);
    setActiveView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(firebaseAuth);
    } catch {
      // ignore firebase signOut edge case
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error
    }
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage error
    }
    setAuthUser(null);
    setAuthToken('');
    clearAdminShortcutHash();
    setActiveView('public');
  };

  const handleReviewAdded = (review: CustomerReview) => {
    baselineReviewsRef.current = [
      review,
      ...baselineReviewsRef.current.filter((r) => r.id !== review.id),
    ];
    setReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
  };

  const topScreen = resolveAdminShortcutScreen({
    isAdminHash,
    authResolved,
    hasAuthUser: Boolean(authUser),
    activeView,
  });

  if (topScreen === 'loading-auth') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F6] px-4 text-stone-800">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-center space-y-3">
          <img
            src="/assets/aistudio/1794735885525_5eb76f5f.png"
            alt="Deeksha Ladies Tailors & Matching Center logo"
            className="h-14 w-14 object-contain rounded-xl border border-stone-200 bg-[#FAF8F6] mx-auto"
          />
          <p className="font-display text-xl font-semibold text-stone-950">Opening Bill Entry</p>
          <p className="text-xs text-stone-600">Checking your saved Admin session...</p>
        </div>
      </div>
    );
  }

  if (topScreen === 'standalone-login') {
    return (
      <BusinessLoginModal
        open={true}
        standalone={true}
        onClose={clearAdminShortcutHash}
        onSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F6] text-stone-900">
      <Navbar
        authUser={authUser}
        activeView={topScreen === 'dashboard' ? 'dashboard' : 'public'}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={() => void handleLogout()}
        onNavigateView={handleNavigateView}
      />

      {topScreen === 'dashboard' && authUser ? (
        <BusinessDashboard
          authUser={authUser}
          authToken={authToken}
          initialShopDetails={shopDetails}
          initialCatalog={catalog}
          initialReviews={reviews}
          onLogout={() => void handleLogout()}
          onShopUpdated={setShopDetails}
          onCatalogUpdated={setCatalog}
          onReviewsUpdated={(nextReviews) => {
            setReviews(nextReviews);
          }}
        />
      ) : (
        <main className="flex-1">
          <HeroSection shopDetails={shopDetails} reviewSummary={reviewSummary} />
          <ServicesAndCatalog services={catalog.services} designPatterns={catalog.designPatterns} />
          <MatchingCenterSection shopDetails={shopDetails} matchingRates={catalog.matchingRates} />
          <CostEstimatorSection
            shopDetails={shopDetails}
            garments={catalog.estimatorGarments}
            turnarounds={catalog.estimatorTurnarounds}
            addons={catalog.estimatorAddons}
          />
          <ReviewsSection
            reviews={reviews}
            reviewSummary={reviewSummary}
            shopDetails={shopDetails}
            onReviewAdded={handleReviewAdded}
          />
          <AppointmentAndLocationSection shopDetails={shopDetails} />
        </main>
      )}

      <footer className="bg-stone-950 text-stone-400 py-10 border-t border-stone-800 text-xs">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/1794735885525_5eb76f5f.png"
              alt="Deeksha Ladies Tailors & Matching Center logo"
              className="w-12 h-12 object-contain rounded-xl bg-white p-1 shrink-0"
            />
            <div className="space-y-1">
              <p className="font-display text-base font-semibold text-white">{shopDetails.businessName}</p>
              <p>
                {shopDetails.address}, {shopDetails.city} – {shopDetails.pincode}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a href="#services" onClick={() => setActiveView('public')} className="hover:text-white transition-colors">
              Services
            </a>
            <a
              href="#matching-center"
              onClick={() => setActiveView('public')}
              className="hover:text-white transition-colors"
            >
              Matching Center
            </a>
            <a href="#estimator" onClick={() => setActiveView('public')} className="hover:text-white transition-colors">
              Estimator
            </a>
            <a href="#reviews" onClick={() => setActiveView('public')} className="hover:text-white transition-colors">
              Reviews
            </a>
            <a
              href={shopDetails.googleBusinessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Google Business Profile
            </a>
            {shopDetails.youtubeUrl && (
              <a
                href={shopDetails.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                YouTube
              </a>
            )}
            {shopDetails.instagramUrl && (
              <a
                href={shopDetails.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
            )}
            {shopDetails.facebookUrl && (
              <a
                href={shopDetails.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Facebook
              </a>
            )}
          </div>

          <div className="md:text-right space-y-1">
            <p className="font-mono-tabular font-semibold text-white">{shopDetails.phone}</p>
            <p>{shopDetails.hours}</p>
          </div>
        </div>
      </footer>

      <BusinessLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
