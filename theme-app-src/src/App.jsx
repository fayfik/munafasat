import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { TopBar, NavRail } from './components/Shell.jsx';
import { InboxColumn } from './components/Inbox.jsx';
import { TaskDetail } from './components/TaskDetail.jsx';
import { Toast } from './components/Panels.jsx';
import { Btn, Empty } from './components/ui.jsx';
import { NewRequest } from './pages/NewRequest.jsx';
import { RequestsHome } from './pages/RequestsHome.jsx';
import { RequestView } from './pages/RequestView.jsx';
import { useStore } from './state/store.jsx';
import { useActor } from './state/actor.jsx';
import { ACTORS, actorById, reviews } from './data/actors.js';
import { mineFor, teamTasksFor, queuedFor, openerFor, canSee } from './lib/assign.js';
import { TASKS, taskById, ACTION_PAST } from './data/tasks.js';

// #/inbox/<task> · #/requests · #/requests/new · #/requests/<id> (edit) · #/requests/view/<id>
const route = () => {
  const h = location.hash;
  const v = h.match(/^#\/requests\/view\/([\w-]+)/);
  if (v) return { area: 'view', id: v[1] };
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
  const { actor, setActor } = useActor();
  const mine = mineFor(actor, state);
  const teamList = teamTasksFor(actor, state);
  const [scope, setScope] = useState('mine');
  const list = scope === 'team' && actor.team ? teamList : mine;
  const firstPending = (l) => l.find((t) => !state.done[t.id])?.id || l[0]?.id || null;

  const [loc, setLoc] = useState(route);
  // A link to someone else's task opens it as that person.
  const [current, setCurrent] = useState(() => route().task || firstPending(mine));
  useEffect(() => { const t = route().task; if (t) { const tk = taskById(t); if (!canSee(actor, tk, state)) { const who = actorById(openerFor(tk, state)); setActor(who.id); if (!mineFor(who, state).some((x) => x.id === t)) setScope('team'); } else if (!mine.some((x) => x.id === t)) setScope('team'); } }, []);
  const [panel, setPanel] = useState({ open: false, view: 'comments' });
  const [toast, setToast] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => { if (loc.area === 'inbox' && current && route().task !== current) history.replaceState(null, '', `#/inbox/${current}`); }, [current, loc.area]);
  useEffect(() => {
    const onHash = () => {
      const r = route();
      // The form rewrites #/requests/new → #/requests/<id> once it saves; keep the same form mounted.
      if (r.area === 'form' && loc.area === 'form' && r.id && !loc.id) { setLoc({ ...r, key: loc.key }); return; }
      transition(() => {
        setLoc(r);
        if (r.area === 'inbox' && r.task) {
          const tk = taskById(r.task);
          if (!canSee(actor, tk, state)) setActor(openerFor(tk, state));
          setScope(mineFor(canSee(actor, tk, state) ? actor : actorById(openerFor(tk, state)), state).some((x) => x.id === r.task) ? 'mine' : 'team');
          setCurrent(r.task);
        }
      });
    };
    addEventListener('hashchange', onHash); return () => removeEventListener('hashchange', onHash);
  }, [loc, actor.id, state]);

  const go = (hash) => { if (location.hash !== hash) location.hash = hash; };
  const open = (id) => { if (id !== current) { history.pushState(null, '', `#/inbox/${id}`); transition(() => setCurrent(id)); } };
  const newRequest = () => { setFormKey((k) => k + 1); go('#/requests/new'); };

  const switchActor = (id) => {
    const a = actorById(id);
    const own = mineFor(a, state);
    // Nothing of their own to do but work waiting in the team queue: open the queue.
    const toTeam = !own.some((t) => !state.done[t.id]) && queuedFor(a, state).length > 0;
    const next = firstPending(toTeam ? teamTasksFor(a, state) : own);
    transition(() => {
      setActor(id);
      setScope(toTeam ? 'team' : 'mine');
      setPanel((p) => ({ ...p, open: false }));
      setToast(null);
      setCurrent(next);
      // Requesters land on their requests; reviewers on their inbox.
      if (!reviews(a)) { if (loc.area === 'inbox') { history.pushState(null, '', '#/requests'); setLoc({ area: 'requests' }); } }
      else if (loc.area !== 'form') { history.pushState(null, '', next ? `#/inbox/${next}` : '#/inbox'); setLoc({ area: 'inbox', task: next }); }
    });
  };

  const complete = (task, action, note) => {
    dispatch({ type: 'complete', task: task.id, action: action.id, note });
    const idx = list.findIndex((t) => t.id === task.id);
    const next = [...list.slice(idx + 1), ...list.slice(0, idx)].find((t) => !state.done[t.id] && t.id !== task.id);
    setToast({ text: `${task.req} · ${task.title} — ${ACTION_PAST[action.id]}.`, undo: task.id, back: task.id });
    if (next) open(next.id);
  };

  const counts = Object.fromEntries(ACTORS.map((a) => [a.id, mineFor(a, state).filter((t) => !state.done[t.id]).length]));
  const queued = Object.fromEntries(ACTORS.map((a) => [a.id, queuedFor(a, state).length]));
  const task = current && taskById(current) && canSee(actor, taskById(current), state) ? taskById(current) : null;
  const changeScope = (v) => transition(() => { setScope(v); const l = v === 'team' ? teamList : mine; if (!l.some((t) => t.id === current)) setCurrent(firstPending(l)); });

  return (
    <div className="app">
      <TopBar counts={counts} queued={queued} onSwitch={switchActor} />
      <div className="body">
        <NavRail count={counts[actor.id]} area={loc.area === 'form' || loc.area === 'view' ? 'requests' : loc.area} onInbox={() => go(current ? `#/inbox/${current}` : '#/inbox')} />
        <div className="workspace">
          {loc.area === 'inbox' && (
            <>
              <InboxColumn key={actor.id} tasks={mine} team={teamList} scope={actor.team ? scope : 'mine'} onScope={changeScope} currentId={task?.id} onOpen={open} />
              {task
                ? <TaskDetail key={task.id} task={task} onComplete={complete} panel={panel} setPanel={setPanel} onPickedUp={() => setScope('mine')} />
                : (
                  <main className="detail inbox-blank" aria-label="No task selected">
                    <Empty icon="icon-inbox" title={reviews(actor) ? 'Nothing to review' : `${actor.name} doesn’t review requests`} sub={reviews(actor) ? 'New tasks will appear here.' : 'Requesters create requests and follow them in My requests.'} />
                    {!reviews(actor) && <Btn variant="secondary" onClick={() => go('#/requests')}>Go to My requests</Btn>}
                  </main>
                )}
            </>
          )}
          {loc.area === 'requests' && <RequestsHome onNew={newRequest} onOpen={(id) => go(`#/requests/${id}`)} onView={(id) => go(`#/requests/view/${id}`)} />}
          {loc.area === 'view' && <RequestView key={loc.id} id={loc.id} onBack={() => go('#/requests')} onEdit={(id) => go(`#/requests/${id}`)} />}
          {loc.area === 'form' && <NewRequest key={`${loc.key}-${formKey}`} id={loc.id} onExit={() => go('#/requests')} />}
        </div>
      </div>
      <Toast toast={toast} onHide={() => setToast(null)} onUndo={() => { dispatch({ type: 'undo', task: toast.undo }); open(toast.back); setToast(null); }} />
    </div>
  );
}
