import { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { TenderProvider } from './context/TenderContext';
import { RequestStoreProvider, useRequests } from './context/RequestStore';
import EmptyPage from './pages/EmptyPage';
import { InboxProvider } from './inbox/store';
import InboxPage from './inbox/InboxPage';
import AppShell, { type AppPage } from './components/AppShell';
import Dashboard from './pages/Dashboard';
import MyRequests from './pages/MyRequests';
import TenderForm from './pages/TenderForm';
import type { SourceType, TenderFormData } from './types/tender';

export type FullPage = AppPage | 'tender-form' | 'procure-intake';

/** What the tender form should open: a new request, or a saved one. */
export type OpenTarget =
  | { kind: 'new'; sourceType?: SourceType; seed?: Partial<TenderFormData> }
  | { kind: 'existing'; id: string };

export default function App() {
  return (
    <LanguageProvider>
      <RequestStoreProvider>
        <AppRoot />
      </RequestStoreProvider>
    </LanguageProvider>
  );
}

function AppRoot() {
  const [page, setPage] = useState<FullPage>('dashboard');
  const [target, setTarget] = useState<OpenTarget>({ kind: 'new' });
  const [formKey, setFormKey] = useState(0);
  const [reqFilter, setReqFilter] = useState<import('./types/tender').TenderStatus | 'all'>('all');
  // A linked Etimad E-Market draft opened in a new tab ("View draft request") — seeded via localStorage.
  const [externalForm, setExternalForm] = useState<TenderFormData | null>(null);
  const store = useRequests();

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('open') !== 'etimad-draft') return;
      const raw = window.localStorage.getItem('munafasat:etimad-draft');
      if (!raw) return;
      const form = JSON.parse(raw) as TenderFormData;
      setExternalForm(form);
      setFormKey((k) => k + 1);
      setPage('tender-form');
    } catch { /* ignore */ }
  }, []);

  function open(t: OpenTarget) {
    setTarget(t);
    setFormKey((k) => k + 1);
    setPage('tender-form');
  }
  // Every new request opens the wizard on its Procurement Route step (Step 1),
  // which determines the channel; the dashboard quick actions land here too.
  const newRequest = (_sourceType?: SourceType) => open({ kind: 'new' });
  const openRequest = (id: string) => {
    // Sample rows (no saved form) open a fresh form, as in the original prototype.
    const r = store.get(id);
    if (r?.form) open({ kind: 'existing', id });
    else newRequest(r?.type);
  };

  const saved = target.kind === 'existing' ? store.get(target.id) : undefined;

  return (
    <InboxProvider>
    <AppShell
      currentPage={page}
      onNavigate={(p) => setPage(p)}
      onNewRequest={() => newRequest()}
    >
      {page === 'dashboard' && (
        <Dashboard
          onNewRequest={newRequest}
          onOpenRequest={openRequest}
          onViewRequests={(f) => { setReqFilter(f ?? 'all'); setPage('my-requests'); }}
        />
      )}
      {page === 'inbox' && <InboxPage />}
      {page === 'reports' && <EmptyPage page="reports" />}
      {page === 'my-requests' && (
        <MyRequests key={reqFilter} initialFilter={reqFilter} onNewRequest={() => newRequest()} onOpenRequest={openRequest} />
      )}
      {page === 'tender-form' && (
        <TenderProvider
          key={formKey}
          requestId={saved?.id}
          initialForm={externalForm ?? saved?.form}
          initialStatus={externalForm ? 'draft' : saved?.status}
          initialSourceType={target.kind === 'new' ? target.sourceType : undefined}
          initialSeed={target.kind === 'new' ? target.seed : undefined}
        >
          <TenderForm onBack={() => setPage('my-requests')} onOpenRequest={openRequest} />
        </TenderProvider>
      )}
    </AppShell>
    </InboxProvider>
  );
}
