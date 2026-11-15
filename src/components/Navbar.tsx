import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { AuthUser } from '../types.ts';

interface NavbarProps {
  authUser: AuthUser | null;
  activeView: 'public' | 'dashboard';
  onOpenLogin: () => void;
  onNavigateView: (view: 'public' | 'dashboard') => void;
}

export function Navbar({ authUser, activeView, onOpenLogin, onNavigateView }: NavbarProps) {
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
          className="font-display text-base sm:text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
        >
          Deeksha Ladies Tailor
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
            Track Order
          </a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {authUser ? (
            <button
              type="button"
              onClick={() => onNavigateView(activeView === 'dashboard' ? 'public' : 'dashboard')}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-rose-800 hover:bg-rose-900 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
            >
              {activeView === 'dashboard' ? 'View Public Site' : 'Owner Portal'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            >
              Business Login
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
            Track Order Status
          </a>
        </nav>
      )}
    </header>
  );
}
