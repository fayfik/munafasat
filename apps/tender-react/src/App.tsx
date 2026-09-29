import { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { TenderProvider } from './context/TenderContext';
import { RequestStoreProvider, useRequests } from './context/RequestStore';
import AppShell, { type AppPage } from './components/AppShell';
import Dashboard from './pages/Dashboard';
import MyRequests from './pages/MyRequests';
import TenderForm from './pages/TenderForm';
import type { SourceType } from './types/tender';

export type FullPage = AppPage | 'tender-form';

/** What the tender form should open: a new request, or a saved one. */
export type OpenTarget = { kind: 'new'; sourceType?: SourceType } | { kind: 'existing'; id: string };

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
  const newRequest = (sourceType?: SourceType) => open({ kind: 'new', sourceType });
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
        >
          <TenderForm onBack={() => setPage('my-requests')} />
        </TenderProvider>
      )}
    </AppShell>
  );
}
