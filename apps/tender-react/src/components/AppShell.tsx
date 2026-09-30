import { useState, type ReactNode } from 'react';
import { useRequests } from '../context/RequestStore';
import logoUrl from '../imports/Color_Full_color__Size_Large__Type_Full_logo.png';
import {
  HomeIcon, ListIcon, BellIcon,
  ChevronRightIcon, PanelLeftIcon,
} from './Icons';
import { useLanguage, useT } from '../context/LanguageContext';
import type { FullPage } from '../App';

export type AppPage = 'dashboard' | 'my-requests';

interface AppShellProps {
  currentPage: FullPage;
  onNavigate: (page: AppPage) => void;
  onNewRequest: () => void;
  children: ReactNode;
}

export default function AppShell({ currentPage, onNavigate, onNewRequest, children }: AppShellProps) {
  const { lang, setLang, isAr } = useLanguage();
  const t = useT();

  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760);
  const { requests: MOCK_TENDERS, userName } = useRequests();
  const displayName = userName || 'Mohammed H.';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'MH';

  const returnedCount = MOCK_TENDERS.filter((t) => t.status === 'returned').length;
  const myRequestsCount = MOCK_TENDERS.length;

  // 'tender-form' counts as child of 'my-requests' for nav highlight purposes
  const activePage: AppPage = currentPage === 'tender-form' ? 'my-requests' : currentPage;

  const NAV_ITEMS = [
    {
      page: 'dashboard' as AppPage,
      label: t('Dashboard', 'الرئيسية'),
      icon: <HomeIcon className="w-4 h-4" />,
    },
    {
      page: 'my-requests' as AppPage,
      label: t('My Requests', 'طلباتي'),
      icon: <ListIcon className="w-4 h-4" />,
      badge: myRequestsCount,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar — primary green, persistent across all pages ─────── */}
      <header className="surface-header h-14 flex items-center justify-between px-5 shrink-0 z-30 text-white">
        {/* Logo shown in white on the green bar */}
        <img
          src={logoUrl}
          alt="SIDF"
          className="h-8 w-auto object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors select-none text-[12px] font-medium text-white border border-white/30 bg-white/10 hover:bg-white/20"
            title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            {isAr ? 'English' : 'عربي'}
          </button>

          {/* Notifications */}
          <button
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white/90 hover:bg-white/15 hover:text-white"
            title={t('Notifications', 'الإشعارات')}
            aria-label={t('Notifications', 'الإشعارات')}
          >
            <BellIcon className="w-4 h-4" />
            {returnedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-warning-400 ring-2 ring-brand-700" />
            )}
          </button>

          {/* User pill */}
          <div className="flex items-center gap-2 ps-3 ms-1 border-s border-white/25">
            <div className="w-7 h-7 rounded-full bg-white text-brand-700 flex items-center justify-center text-[11px] font-bold select-none">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[12px] font-semibold text-white">{displayName}</p>
              <p className="text-[10px] text-white/75">
                {t('Requester', 'مقدم الطلب')} · IT &amp; Digital
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Persistent sidebar nav ── */}
        <aside
          className="sidebar-transition flex flex-col shrink-0"
          style={{
            backgroundColor: 'var(--color-nav-bg)',
            borderInlineEnd: '1px solid var(--color-nav-border)',
            boxShadow: '4px 0 12px rgba(27, 31, 25, 0.05)',
            position: 'relative',
            zIndex: 5,
            width: collapsed ? '56px' : '224px',
          }}
        >
          <nav className="flex-1 px-2 pt-3 pb-3 overflow-y-auto overflow-x-hidden">
            {/* "Main Menu" title with the expand / collapse switch beside it */}
            <div className={`flex items-center mb-2 ${collapsed ? 'justify-center' : 'justify-between ps-3 pe-1'}`}>
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-nav-muted)' }}>
                  {t('Main Menu', 'القائمة الرئيسية')}
                </p>
              )}
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-nav-hover)] hover:text-[var(--color-nav-text)]"
                style={{ color: 'var(--color-nav-muted)' }}
                title={collapsed ? t('Expand sidebar', 'توسيع القائمة') : t('Collapse sidebar', 'طي القائمة')}
                aria-label={collapsed ? t('Expand sidebar', 'توسيع القائمة') : t('Collapse sidebar', 'طي القائمة')}
                aria-expanded={!collapsed}
              >
                <PanelLeftIcon className={`w-4 h-4 transition-transform duration-200 ${(isAr ? !collapsed : collapsed) ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = activePage === item.page;
                return (
                  <li key={item.page}>
                    <button
                      onClick={() => onNavigate(item.page)}
                      className="w-full flex items-center gap-3 rounded-lg text-start transition-all group"
                      style={{
                        padding: collapsed ? '10px 12px' : '10px 12px',
                        backgroundColor: isActive ? 'var(--color-nav-active)' : undefined,
                        color: isActive ? 'var(--color-brand-700)' : 'var(--color-nav-text)',
                        justifyContent: collapsed ? 'center' : undefined,
                      }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-nav-hover)'; }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; }}
                      title={collapsed ? item.label : undefined}
                    >
                      <span
                        className="flex-shrink-0 transition-colors"
                        style={{ color: isActive ? 'var(--color-brand-700)' : 'var(--color-nav-muted)' }}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                              style={{
                                backgroundColor: isActive ? 'var(--color-brand-100)' : 'var(--color-neutral-200)',
                                color: isActive ? 'var(--color-brand-700)' : 'var(--color-nav-muted)',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {!collapsed && (
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-nav-border)' }}>
                <p
                  className="text-[9px] font-bold uppercase tracking-widest px-3 mb-3"
                  style={{ color: 'var(--color-nav-muted)' }}
                >
                  {t('Coming Soon', 'قريباً')}
                </p>
                {[
                  { label: t('Notifications', 'الإشعارات'), icon: <BellIcon className="w-4 h-4" /> },
                  { label: t('Reports', 'التقارير'), icon: <ChevronRightIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed select-none"
                    style={{ color: 'var(--color-nav-muted)', opacity: 0.5 }}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {collapsed && (
              <div className="mt-6 pt-4 flex flex-col items-center gap-1" style={{ borderTop: '1px solid var(--color-nav-border)' }}>
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-lg cursor-not-allowed"
                  style={{ color: 'var(--color-nav-muted)', opacity: 0.4 }}
                  title={t('Notifications', 'الإشعارات')}
                >
                  <BellIcon className="w-4 h-4" />
                </div>
              </div>
            )}
          </nav>

        </aside>

        {/* ── Main content area — conditioned on page for scroll management ── */}
        <main
          className={`flex-1 bg-surface ${
            currentPage === 'tender-form' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
