import { useState, type ReactNode } from 'react';
import { useRequests } from '../context/RequestStore';
import logoUrl from '../imports/Color_Full_color__Size_Large__Type_Full_logo.png';
import {
  BellIcon, PanelLeftIcon,
  NavDashboardIcon, NavRequestsIcon, NavInboxIcon, NavReportsIcon,
} from './Icons';
import { useLanguage, useT } from '../context/LanguageContext';
import type { FullPage } from '../App';

export type AppPage = 'dashboard' | 'my-requests' | 'inbox' | 'reports';

interface AppShellProps {
  currentPage: FullPage;
  onNavigate: (page: AppPage) => void;
  onNewRequest: () => void;
  children: ReactNode;
}

export default function AppShell({ currentPage, onNavigate, onNewRequest, children }: AppShellProps) {
  const { lang, setLang, isAr } = useLanguage();
  const t = useT();

  // Collapsed by default; the switch beside "Main Menu" expands it.
  const [collapsed, setCollapsed] = useState(true);
  const { requests: MOCK_TENDERS, userName } = useRequests();
  const displayName = userName || 'Mohammed H.';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'MH';

  const returnedCount = MOCK_TENDERS.filter((t) => t.status === 'returned').length;
  const myRequestsCount = MOCK_TENDERS.length;

  // 'tender-form' counts as child of 'my-requests' for nav highlight purposes
  const activePage: AppPage = currentPage === 'tender-form' || currentPage === 'procure-intake' ? 'my-requests' : currentPage;

  const NAV_ITEMS = [
    { page: 'dashboard' as AppPage, label: t('Dashboard', 'الرئيسية'), Icon: NavDashboardIcon },
    { page: 'my-requests' as AppPage, label: t('My Requests', 'طلباتي'), Icon: NavRequestsIcon, badge: myRequestsCount },
    { page: 'inbox' as AppPage, label: t('Inbox', 'الوارد'), Icon: NavInboxIcon, badge: returnedCount > 0 ? returnedCount : undefined },
    { page: 'reports' as AppPage, label: t('Reports', 'التقارير'), Icon: NavReportsIcon },
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
                      aria-label={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span
                        className="relative flex-shrink-0 transition-colors"
                        style={{ color: isActive ? 'var(--color-brand-700)' : 'var(--color-nav-muted)' }}
                      >
                        {collapsed && !!item.badge && (
                          <span className="absolute -top-1.5 -end-2 min-w-[15px] h-[15px] px-1 rounded-full bg-brand-600 text-white text-[9px] font-bold leading-[15px] text-center">
                            {item.badge}
                          </span>
                        )}
                        <item.Icon filled={isActive} />
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
