import { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { TenderProvider } from './context/TenderContext';
import { RequestStoreProvider, useRequests } from './context/RequestStore';
import EmptyPage from './pages/EmptyPage';
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
  const store = useRequests();

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
    <AppShell
      currentPage={page}
      onNavigate={(p) => setPage(p)}
      onNewRequest={() => newRequest()}
    >
      {page === 'dashboard' && (
        <Dashboard
          onNewRequest={newRequest}
          onOpenRequest={openRequest}
          onViewRequests={() => setPage('my-requests')}
        />
      )}
      {(page === 'inbox' || page === 'reports') && <EmptyPage page={page} />}
      {page === 'my-requests' && (
        <MyRequests onNewRequest={() => newRequest()} onOpenRequest={openRequest} />
      )}
      {page === 'tender-form' && (
        <TenderProvider
          key={formKey}
          requestId={saved?.id}
          initialForm={saved?.form}
          initialStatus={saved?.status}
          initialSourceType={target.kind === 'new' ? target.sourceType : undefined}
          initialSeed={target.kind === 'new' ? target.seed : undefined}
        >
          <TenderForm onBack={() => setPage('my-requests')} />
        </TenderProvider>
      )}
    </AppShell>
  );
}
