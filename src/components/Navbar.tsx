'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, User, Menu, X, LogOut, LayoutDashboard, MessageSquare } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export interface NavDiscipline {
  id: string;
  name: string;
  slug: string;
  subdisciplines: Array<{ id: string; name: string; slug: string }>;
}

export interface SessionUser {
  userId: string;
  fullName: string;
  username: string;
  role: string;
}

export function Navbar({
  disciplines = [],
  user = null,
}: {
  disciplines?: NavDiscipline[];
  user?: SessionUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubjectsOpen, setMobileSubjectsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSubjectsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSubjectsOpen(false);
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  };

  const isHome = pathname === '/';
  const navBg =
    scrolled || !isHome
      ? 'bg-[#0B1F3A]/95 backdrop-blur-md border-b border-medblue-400/25 shadow-lg'
      : 'bg-gradient-to-b from-[#071426]/80 to-transparent';

  const linkClass = (href: string) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return `relative py-1.5 text-sm xl:text-base font-medium transition-colors ${
      active
        ? 'text-white after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2.5px] after:bg-medblue-400 after:rounded-full'
        : 'text-blue-100/90 hover:text-white'
    }`;
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 pt-[env(safe-area-inset-top)] ${navBg}`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between gap-4">
        {/* Left: Logo + tagline */}
        <div className="shrink-0">
          <BrandLogo />
        </div>

        {/* Centre-Right Desktop Links (NO Study Tools) */}
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-8 xl:gap-11">
          <Link href="/" className={linkClass('/')}>
            Home
          </Link>
          <Link href="/question-bank" className={linkClass('/question-bank')}>
            Question Bank
          </Link>

          {/* Subjects Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setSubjectsOpen(true)}
            onMouseLeave={() => setSubjectsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setSubjectsOpen((o) => !o)}
              aria-expanded={subjectsOpen}
              aria-haspopup="true"
              className={`${linkClass('/subjects')} inline-flex items-center gap-1`}
            >
              <span>Subjects</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${subjectsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {subjectsOpen && (
              <div className="absolute left-0 top-full pt-2 w-72 z-50">
                <div className="bg-navy-900 border border-medblue-400/30 rounded-xl shadow-2xl p-2 text-white">
                  <Link
                    href="/subjects"
                    className="block px-3 py-2 text-xs font-semibold uppercase tracking-wider text-medblue-400 hover:bg-navy-800 rounded-lg"
                  >
                    All Disciplines →
                  </Link>
                  <div className="my-1 border-t border-white/10" />
                  {disciplines.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-blue-200/75">
                      Subjects will appear here soon
                    </p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-1">
                      {disciplines.map((disc) => (
                        <div key={disc.id} className="rounded-lg hover:bg-navy-800/80 p-1.5">
                          <Link
                            href={`/subjects/${disc.slug}`}
                            className="block px-2 py-1 text-sm font-semibold text-white hover:text-medblue-400"
                          >
                            {disc.name}
                          </Link>
                          {disc.subdisciplines.length > 0 && (
                            <div className="pl-3 mt-0.5 space-y-0.5 border-l border-medblue-400/30">
                              {disc.subdisciplines.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/subjects/${disc.slug}/${sub.slug}`}
                                  className="block px-2 py-0.5 text-xs text-blue-200 hover:text-white"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/about" className={linkClass('/about')}>
            About
          </Link>
        </nav>

        {/* Far Right Cluster: Always pinned (Log In + Register OR User Menu + Mobile Hamburger) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-medblue-400/50 bg-navy-800/80 text-white text-sm font-medium hover:bg-navy-700"
              >
                <User className="w-4 h-4 text-medblue-400" />
                <span className="max-w-[110px] truncate">{user.username}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-navy-900 border border-medblue-400/30 rounded-xl shadow-2xl py-1.5 text-sm text-white z-50">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-navy-800"
                  >
                    <LayoutDashboard className="w-4 h-4 text-medblue-400" />
                    Dashboard
                  </Link>
                  <Link
                    href="/feedback"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-navy-800"
                  >
                    <MessageSquare className="w-4 h-4 text-medblue-400" />
                    Feedback
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-300 hover:bg-navy-800"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/60 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-5 py-2 rounded-full bg-medblue-500 hover:bg-medblue-600 text-white text-sm font-semibold shadow-md transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer beneath frozen header */}
      {mobileOpen && (
        <div className="lg:hidden bg-navy-900 border-b border-medblue-400/30 px-4 pt-3 pb-6 space-y-3 text-white shadow-2xl">
          <Link href="/" className="block py-2 text-base font-medium hover:text-medblue-400">
            Home
          </Link>
          <Link
            href="/question-bank"
            className="block py-2 text-base font-medium hover:text-medblue-400"
          >
            Question Bank
          </Link>

          {/* Mobile Subjects Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setMobileSubjectsOpen((o) => !o)}
              className="w-full flex items-center justify-between py-2 text-base font-medium hover:text-medblue-400"
            >
              <span>Subjects</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${mobileSubjectsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {mobileSubjectsOpen && (
              <div className="pl-3 mt-1 space-y-2 border-l border-medblue-400/30">
                <Link href="/subjects" className="block py-1 text-sm text-medblue-400">
                  All Disciplines
                </Link>
                {disciplines.length === 0 ? (
                  <p className="text-xs text-blue-200/75 py-1">Subjects will appear here soon</p>
                ) : (
                  disciplines.map((d) => (
                    <div key={d.id}>
                      <Link
                        href={`/subjects/${d.slug}`}
                        className="block py-1 text-sm font-medium text-white"
                      >
                        {d.name}
                      </Link>
                      {d.subdisciplines.map((s) => (
                        <Link
                          key={s.id}
                          href={`/subjects/${d.slug}/${s.slug}`}
                          className="block pl-3 py-0.5 text-xs text-blue-200"
                        >
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Link href="/about" className="block py-2 text-base font-medium hover:text-medblue-400">
            About
          </Link>

          {!user && (
            <div className="pt-3 border-t border-white/15 flex items-center gap-3">
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full border border-white/60 text-white text-sm font-medium"
              >
                <User className="w-4 h-4" />
                Log In
              </Link>
              <Link
                href="/register"
                className="flex-1 inline-flex items-center justify-center py-2.5 rounded-full bg-medblue-500 text-white text-sm font-semibold"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
