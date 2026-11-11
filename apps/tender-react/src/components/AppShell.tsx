import { useState, type ReactNode } from 'react';
import { NotificationBell, TaskPushHost } from './TaskNotifications';
import { TopProgress, useLoading } from './Loader';
import { useRequests } from '../context/RequestStore';
import { useInbox } from '../inbox/store';
import logoUrl from '../imports/Color_Full_color__Size_Large__Type_Full_logo.png';
import {
  BellIcon, PanelLeftIcon,
  NavDashboardIcon, NavRequestsIcon, NavInboxIcon, NavReportsIcon,
} from './Icons';
import { useLanguage, useT } from '../context/LanguageContext';
import type { FullPage } from '../App';
import { TL_PERSON } from '../inbox/data';
import { useEffect, useRef } from 'react';

export type AppPage = 'dashboard' | 'my-requests' | 'inbox' | 'reports';

interface AppShellProps {
  currentPage: FullPage;
  onNavigate: (page: AppPage) => void;
  onNewRequest: () => void;
  children: ReactNode;
}

export default function AppShell({ currentPage, onNavigate, onNewRequest, children }: AppShellProps) {
  const { focusTask } = useInbox();
  const openTask = (id: string) => { focusTask(id); onNavigate('inbox'); };
  const { lang, setLang, isAr } = useLanguage();
  const t = useT();

  useLoading([currentPage], 350); // top progress bar on every page change

  // Collapsed by default; the switch beside "Main Menu" expands it.
  const [collapsed, setCollapsed] = useState(true);
  const { requests: MOCK_TENDERS, userName } = useRequests();
  const displayName = userName || 'Mohammed H.';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'MH';

  const returnedCount = MOCK_TENDERS.filter((t) => t.status === 'returned').length;
  const myRequestsCount = MOCK_TENDERS.length;
  const inboxCount = useInbox().countsByView['needs-action'];

  // 'tender-form' counts as child of 'my-requests' for nav highlight purposes
  const activePage: AppPage = currentPage === 'tender-form' || currentPage === 'procure-intake' || currentPage === 'request-detail' ? 'my-requests' : currentPage;

  const NAV_ITEMS = [
    { page: 'dashboard' as AppPage, label: t('Dashboard', 'الرئيسية'), Icon: NavDashboardIcon },
    { page: 'my-requests' as AppPage, label: t('My Requests', 'طلباتي'), Icon: NavRequestsIcon, badge: myRequestsCount },
    { page: 'inbox' as AppPage, label: t('Inbox', 'الوارد'), Icon: NavInboxIcon, badge: inboxCount > 0 ? inboxCount : undefined },
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
          <NotificationBell onOpenTask={openTask} />
          <TaskPushHost onOpenTask={openTask} />

          {/* User pill — switches between the signed-in view and the Team Lead view */}
          <PersonaMenu displayName={displayName} initials={initials} />
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
        <TopProgress />
      </div>
    </div>
  );
}

function PersonaMenu({ displayName, initials }: { displayName: string; initials: string }) {
  const { persona, setPersona, teamCounts } = useInbox();
  const { isAr } = useLanguage();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const tl = persona === 'tl';
  const tlName = isAr ? TL_PERSON.nameAr ?? TL_PERSON.name : TL_PERSON.name;
  const tlInit = TL_PERSON.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  const Opt = ({ v, init, name, sub, badge }: { v: 'me' | 'tl'; init: string; name: string; sub: string; badge?: number }) => (
    <button type="button" role="menuitemradio" aria-checked={persona === v} data-persona={v} onClick={() => { setPersona(v); setOpen(false); }}
      className={`w-full text-start flex items-center gap-3 px-3 py-2.5 rounded-lg ${persona === v ? 'bg-brand-50/70' : 'hover:bg-neutral-50'}`}>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${v === 'tl' ? 'bg-[#2A3466] text-white' : 'bg-brand-600 text-white'}`}>{init}</span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-neutral-900 truncate">{name}</span><span className="block text-[11.5px] text-neutral-500 truncate">{sub}</span></span>
      {badge ? <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-warning-100 text-warning-800 text-[11px] font-bold inline-flex items-center justify-center">{badge}</span> : null}
      {persona === v && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4 text-brand-600"><path d="M5 12l5 5L20 7" /></svg>}
    </button>
  );
  return (
    <div ref={ref} className="relative ps-3 ms-1 border-s border-white/25">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} data-persona-switch
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 -my-1 hover:bg-white/10">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold select-none ${tl ? 'bg-[#2A3466] text-white ring-2 ring-white/80' : 'bg-white text-brand-700'}`}>{tl ? tlInit : initials}</div>
        <div className="hidden sm:block leading-tight text-start">
          <p className="text-[12px] font-semibold text-white flex items-center gap-1.5">{tl ? tlName : displayName}{tl && <span className="px-1.5 py-px rounded bg-white/20 text-[9.5px] font-bold uppercase tracking-wide" data-tl-tag>{t('TL view', 'عرض رئيس الفريق')}</span>}</p>
          <p className="text-[10px] text-white/75">{tl ? t('Team Lead · Procurement', 'رئيس الفريق · المشتريات') : <>{t('Requester', 'مقدم الطلب')} · IT &amp; Digital</>}</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" className="pop-in absolute end-0 top-11 z-50 w-[300px] rounded-xl bg-white border border-neutral-200 shadow-xl p-1.5 text-neutral-900">
          <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{t('Switch view', 'تبديل العرض')}</p>
          <Opt v="me" init={initials} name={displayName} sub={t('Requester · IT & Digital', 'مقدم الطلب · تقنية المعلومات')} />
          <Opt v="tl" init={tlInit} name={tlName} sub={t('TL view · Procurement team', 'عرض رئيس الفريق · المشتريات')} badge={teamCounts['needs-action']} />
        </div>
      )}
    </div>
  );
}
