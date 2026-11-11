import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { TopBar, NavRail } from './components/Shell.jsx';
import { InboxColumn } from './components/Inbox.jsx';
import { TaskDetail } from './components/TaskDetail.jsx';
import { Toast } from './components/Panels.jsx';
import { useStore } from './state/store.jsx';
import { TASKS, taskById, ACTION_PAST } from './data/tasks.js';

const parse = () => {
  const m = location.hash.match(/^#\/inbox\/([\w-]+)/);
  return m && taskById(m[1]) ? m[1] : null;
};

// Animate in-app navigation where the browser supports view transitions.
const transition = (fn) => {
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(() => flushSync(fn));
  else fn();
};

export default function App() {
  const { state, dispatch } = useStore();
  const firstPending = () => TASKS.find((t) => !state.done[t.id])?.id || TASKS[0].id;
  const [current, setCurrent] = useState(() => parse() || firstPending());
  const [panel, setPanel] = useState({ open: false, view: 'comments' });
  const [toast, setToast] = useState(null);

  useEffect(() => { if (parse() !== current) history.replaceState(null, '', `#/inbox/${current}`); }, [current]);
  useEffect(() => {
    const onHash = () => { const id = parse(); if (id && id !== current) transition(() => setCurrent(id)); };
    addEventListener('hashchange', onHash); return () => removeEventListener('hashchange', onHash);
  }, [current]);

  const open = (id) => { if (id !== current) { history.pushState(null, '', `#/inbox/${id}`); transition(() => setCurrent(id)); } };

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
        <NavRail count={pendingCount} />
        <div className="workspace">
          <InboxColumn currentId={current} onOpen={open} />
          <TaskDetail key={task.id} task={task} onComplete={complete} panel={panel} setPanel={setPanel} />
        </div>
      </div>
      <Toast toast={toast} onHide={() => setToast(null)} onUndo={() => { dispatch({ type: 'undo', task: toast.undo }); open(toast.back); setToast(null); }} />
    </div>
  );
}
