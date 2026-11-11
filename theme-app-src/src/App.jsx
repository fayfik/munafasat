import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { TopBar, NavRail } from './components/Shell.jsx';
import { InboxColumn } from './components/Inbox.jsx';
import { TaskDetail } from './components/TaskDetail.jsx';
import { Toast } from './components/Panels.jsx';
import { NewRequest } from './pages/NewRequest.jsx';
import { RequestsHome } from './pages/RequestsHome.jsx';
import { useStore } from './state/store.jsx';
import { TASKS, taskById, ACTION_PAST } from './data/tasks.js';

// #/inbox/<task> · #/requests · #/requests/new · #/requests/<id>
const route = () => {
  const h = location.hash;
  const r = h.match(/^#\/requests(?:\/([\w-]+))?/);
  if (r) return r[1] ? { area: 'form', id: r[1] === 'new' ? null : r[1], key: r[1] } : { area: 'requests' };
  const m = h.match(/^#\/inbox\/([\w-]+)/);
  return { area: 'inbox', task: m && taskById(m[1]) ? m[1] : null };
};

// Animate in-app navigation where the browser supports view transitions.
const transition = (fn) => {
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(() => flushSync(fn));
  else fn();
};

export default function App() {
  const { state, dispatch } = useStore();
  const firstPending = () => TASKS.find((t) => !state.done[t.id])?.id || TASKS[0].id;
  const [loc, setLoc] = useState(route);
  const [current, setCurrent] = useState(() => route().task || firstPending());
  const [panel, setPanel] = useState({ open: false, view: 'comments' });
  const [toast, setToast] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => { if (loc.area === 'inbox' && route().task !== current) history.replaceState(null, '', `#/inbox/${current}`); }, [current, loc.area]);
  useEffect(() => {
    const onHash = () => {
      const r = route();
      // The form rewrites #/requests/new → #/requests/<id> once it saves; keep the same form mounted.
      if (r.area === 'form' && loc.area === 'form' && r.id && !loc.id) { setLoc({ ...r, key: loc.key }); return; }
      transition(() => { setLoc(r); if (r.area === 'inbox' && r.task) setCurrent(r.task); });
    };
    addEventListener('hashchange', onHash); return () => removeEventListener('hashchange', onHash);
  }, [loc]);

  const go = (hash) => { if (location.hash !== hash) location.hash = hash; };
  const open = (id) => { if (id !== current) { history.pushState(null, '', `#/inbox/${id}`); transition(() => setCurrent(id)); } };
  const newRequest = () => { setFormKey((k) => k + 1); go('#/requests/new'); };

  const complete = (task, action, note) => {
    dispatch({ type: 'complete', task: task.id, action: action.id, note });
    const idx = TASKS.findIndex((t) => t.id === task.id);
    const next = [...TASKS.slice(idx + 1), ...TASKS.slice(0, idx)].find((t) => !state.done[t.id] && t.id !== task.id);
    setToast({ text: `${task.req} · ${task.title} — ${ACTION_PAST[action.id]}.`, undo: task.id, back: task.id });
    if (next) open(next.id);
  };

  const pendingCount = TASKS.filter((t) => !state.done[t.id]).length;
  const task = taskById(current);

  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <NavRail count={pendingCount} area={loc.area === 'form' ? 'requests' : loc.area} onInbox={() => go(`#/inbox/${current}`)} />
        <div className="workspace">
          {loc.area === 'inbox' && (
            <>
              <InboxColumn currentId={current} onOpen={open} />
              <TaskDetail key={task.id} task={task} onComplete={complete} panel={panel} setPanel={setPanel} />
            </>
          )}
          {loc.area === 'requests' && <RequestsHome onNew={newRequest} onOpen={(id) => go(`#/requests/${id}`)} />}
          {loc.area === 'form' && <NewRequest key={`${loc.key}-${formKey}`} id={loc.id} onExit={() => go('#/requests')} />}
        </div>
      </div>
      <Toast toast={toast} onHide={() => setToast(null)} onUndo={() => { dispatch({ type: 'undo', task: toast.undo }); open(toast.back); setToast(null); }} />
    </div>
  );
}
