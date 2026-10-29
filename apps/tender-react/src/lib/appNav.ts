// Prototype navigation between the request wizard and the Inbox (the same person plays
// the requester and Procurement). App listens for these and switches page.
export type AppNavDetail = { kind: 'inbox-task'; taskId: string } | { kind: 'request'; id: string };

const EVT = 'munafasat:navigate';
export const openInboxTask = (taskId: string) => window.dispatchEvent(new CustomEvent<AppNavDetail>(EVT, { detail: { kind: 'inbox-task', taskId } }));
export const openRequestFromAnywhere = (id: string) => window.dispatchEvent(new CustomEvent<AppNavDetail>(EVT, { detail: { kind: 'request', id } }));
export function onAppNav(fn: (d: AppNavDetail) => void) {
  const h = (e: Event) => fn((e as CustomEvent<AppNavDetail>).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}
