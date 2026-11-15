import { useState } from 'react';
import { Lock, LogOut, Menu, X } from 'lucide-react';
import type { AuthUser } from '../types.ts';

interface NavbarProps {
  authUser: AuthUser | null;
  activeView: 'public' | 'dashboard';
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigateView: (view: 'public' | 'dashboard') => void;
}

export function Navbar({ authUser, activeView, onOpenLogin, onLogout, onNavigateView }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = () => {
    setMobileOpen(false);
    if (activeView !== 'public') {
      onNavigateView('public');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F6]/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 md:gap-8">
        <a
          href="#top"
          onClick={() => onNavigateView('public')}
          className="inline-flex items-center gap-2.5 font-display text-base sm:text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
        >
          <img
            src="/assets/aistudio/1794735885525_5eb76f5f.png"
            alt="Deeksha Ladies Tailors & Matching Center logo"
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-lg border border-stone-200 bg-[#FAF8F6] shrink-0"
          />
          <span>Deeksha Ladies Tailor</span>
        </a>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <a
            href="#services"
            onClick={handleLinkClick}
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Services
          </a>
          <a
            href="#matching-center"
            onClick={handleLinkClick}
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Matching
          </a>
          <a
            href="#estimator"
            onClick={handleLinkClick}
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Estimator
          </a>
          <a
            href="#reviews"
            onClick={handleLinkClick}
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Reviews
          </a>
          <a
            href="#track-order"
            onClick={handleLinkClick}
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Check Order Status
          </a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {authUser ? (
            <>
              <button
                type="button"
                onClick={() => onNavigateView(activeView === 'dashboard' ? 'public' : 'dashboard')}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-rose-800 hover:bg-rose-900 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
              >
                {activeView === 'dashboard' ? 'View Public Site' : 'Admin Dashboard'}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-950 border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Logout</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-stone-700 hover:text-stone-950 border border-stone-300 hover:border-stone-400 bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Admin Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 text-stone-700 hover:bg-stone-200/60 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="md:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1">
          <a href="#services" onClick={handleLinkClick} className="block py-2.5 text-sm font-medium text-stone-700 hover:text-rose-800">
            Tailoring Services
          </a>
          <a href="#matching-center" onClick={handleLinkClick} className="block py-2.5 text-sm font-medium text-stone-700 hover:text-rose-800">
            Matching Center
          </a>
          <a href="#estimator" onClick={handleLinkClick} className="block py-2.5 text-sm font-medium text-stone-700 hover:text-rose-800">
            Cost Estimator
          </a>
          <a href="#reviews" onClick={handleLinkClick} className="block py-2.5 text-sm font-medium text-stone-700 hover:text-rose-800">
            Customer Reviews
          </a>
          <a href="#track-order" onClick={handleLinkClick} className="block py-2.5 text-sm font-semibold text-rose-800">
            Check Order Status
          </a>
        </nav>
      )}
    </header>
  );
}
