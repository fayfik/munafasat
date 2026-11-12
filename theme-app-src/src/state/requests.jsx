// Requests the user creates in this prototype (drafts + submitted), kept for the
// browser session only — the same rule as the inbox store.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_QUAL } from '../data/newRequest.js';

const KEY = 'munafasat-theme-requests-v1';

export const emptyForm = () => ({
  sourceType: 'tendering',
  routeChoice: '',
  projectId: '',
  costCenterId: '',
  selectedItemIds: [],
  freeItems: [],
  routeJustification: '',
  movedToDraft: null,
  purpose: '',
  scopeOfWork: '',
  scopeTerms: '',
  scopeIncludes: [],
  executionLocation: '',
  startDate: '',
  contractDurationType: 'months',
  contractDuration: '',
  boqItems: [],
  paymentStages: [],
  technicalCommitteeMembers: [],
  technicalDocumentsList: [],
  technicalRequirements: [],
  evaluationCriteria: [],
  technicalPassingPercentage: '',
  qualificationCommitteeMembers: [],
  qualificationCriteria: DEFAULT_QUAL.map((m) => ({ ...m, subCriteria: m.subCriteria.map((s) => ({ ...s })) })),
  qualificationPassingPercentage: '',
  extraRegulatoryRecords: [],
  attachments: [],
  techAnswers: {},
  stdOverrides: {},
  bcmAnswers: {},
  bcmValues: {},
  tprAnswers: {},
});

function load() {
  try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return s; } catch (e) { /* storage unavailable */ }
  return {};
}

const Ctx = createContext(null);

export function RequestsProvider({ children }) {
  const [all, setAll] = useState(load);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* ignore */ } }, [all]);
  const save = useCallback((id, patch) => setAll((a) => ({ ...a, [id]: { ...(a[id] || { id, createdAt: new Date().toISOString(), status: 'draft' }), ...patch, updatedAt: new Date().toISOString() } })), []);
  const remove = useCallback((id) => setAll((a) => { const n = { ...a }; delete n[id]; return n; }), []);
  const value = useMemo(() => ({ all, list: Object.values(all).sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || '')), save, remove, get: (id) => all[id] }), [all, save, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useRequests = () => useContext(Ctx);
