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
import RequestDetail from './pages/RequestDetail';
import type { SourceType, TenderFormData } from './types/tender';
import { onAppNav } from './lib/appNav';

export type FullPage = AppPage | 'tender-form' | 'procure-intake' | 'request-detail';

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
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reqFilter, setReqFilter] = useState<import('./types/tender').TenderStatus | 'all'>('all');
  // A linked Etimad E-Market draft opened in a new tab ("View draft request") — seeded via localStorage.
  const [externalForm, setExternalForm] = useState<TenderFormData | null>(null);
  const store = useRequests();
  // Prototype hand-offs: requester → Procurement's task in the Inbox, and back to the request.
  const [focusTask, setFocusTask] = useState<{ id: string; n: number } | null>(null);

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
  // Drafts and returned requests open in the wizard to keep working on them; anything already
  // submitted opens its detail page (where it stands, what's in it, linked requests).
  const editRequest = (id: string) => open({ kind: 'existing', id });
  const openRequest = (id: string) => {
    const r = store.get(id);
    const editable = r?.status === 'draft' || r?.status === 'returned' || !!r?.form?.routeCheck;
    if (r && !editable) { setDetailId(id); setPage('request-detail'); return; }
    // Sample rows (no saved form) open a fresh form, as in the original prototype.
    if (r?.form) editRequest(id);
    else newRequest(r?.type);
  };

  // Re-subscribe each render so the handler sees the current store.
  useEffect(() => onAppNav((d) => {
    if (d.kind === 'inbox-task') { setFocusTask((f) => ({ id: d.taskId, n: (f?.n ?? 0) + 1 })); setPage('inbox'); }
    else openRequest(d.id);
  }));

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
      {page === 'inbox' && <InboxPage key={focusTask ? `${focusTask.id}-${focusTask.n}` : 'inbox'} focusTaskId={focusTask?.id} />}
      {page === 'reports' && <EmptyPage page="reports" />}
      {page === 'request-detail' && detailId && (
        <RequestDetail key={detailId} id={detailId} onBack={() => setPage('my-requests')} onEdit={editRequest} onOpen={openRequest} />
      )}
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
