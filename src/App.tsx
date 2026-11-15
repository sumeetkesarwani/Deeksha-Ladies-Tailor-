import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { firebaseAuth } from './firebase.ts';
import type {
  AuthUser,
  CatalogConfig,
  CustomerReview,
  PublicBootstrapPayload,
  ReviewSummary,
  ShopDetails,
} from './types.ts';
import { DEFAULT_CATALOG } from './utils/tailoring.ts';
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
  baseDirectoryRating: 4.8,
  baseDirectoryReviewCount: 35,
};

const FALLBACK_SUMMARY: ReviewSummary = {
  averageRating: 4.8,
  totalReviewsCount: 35,
  googleProfileUrl: 'https://share.google/zbgBH15WaKYkn3CG8',
  sourceNote: 'Verified rating across Google Business Profile & local Kolkata directories',
};

export default function App() {
  const [shopDetails, setShopDetails] = useState<ShopDetails>(FALLBACK_SHOP);
  const [catalog, setCatalog] = useState<CatalogConfig>(DEFAULT_CATALOG);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>(FALLBACK_SUMMARY);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'public' | 'dashboard'>('public');

  useEffect(() => {
    const loadPublic = async () => {
      try {
        const res = await fetch('/api/public/bootstrap');
        if (!res.ok) return;
        const data = (await res.json()) as PublicBootstrapPayload;
        setShopDetails(data.shopDetails);
        if (data.catalog) {
          setCatalog(data.catalog);
        }
        setReviews(data.reviews);
        setReviewSummary(data.reviewSummary);
      } catch {
        // Keep fallback shop details if offline
      }
    };

    void loadPublic();

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore storage error
        }
        setAuthUser(null);
        setAuthToken('');
        setActiveView('public');
        return;
      }

      const fallbackUser: AuthUser = {
        businessId: fbUser.email || fbUser.uid,
        ownerName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Deeksha Admin',
      };
      setAuthUser(fallbackUser);

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

    return () => {
      unsubscribe();
    };
  }, []);

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
    setActiveView('public');
  };

  const handleReviewAdded = (review: CustomerReview, summary: ReviewSummary) => {
    setReviews((prev) => [review, ...prev]);
    setReviewSummary(summary);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F6] text-stone-900">
      <Navbar
        authUser={authUser}
        activeView={activeView}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={() => void handleLogout()}
        onNavigateView={setActiveView}
      />

      {activeView === 'dashboard' && authUser ? (
        <BusinessDashboard
          authUser={authUser}
          authToken={authToken}
          onLogout={() => void handleLogout()}
          onShopUpdated={setShopDetails}
          onCatalogUpdated={setCatalog}
          onReviewsUpdated={(nextReviews, nextSummary) => {
            setReviews(nextReviews);
            setReviewSummary(nextSummary);
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
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-white">{shopDetails.businessName}</p>
            <p>
              {shopDetails.address}, {shopDetails.city} – {shopDetails.pincode}
            </p>
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
