// The requester's side of a return (design-review "Respond to the review comments"):
// reply to or resolve each comment, turn on editing to change only the commented
// fields, then resubmit — the task goes back to the reviewer who returned it.
import { useEffect, useState } from 'react';
import { useTask, ReviewHeader, CommentBox } from '../components/ReviewKit.jsx';
import { Icon, Btn, Avatar } from '../components/ui.jsx';
import { Input } from '../components/FormKit.jsx';
import { useStore } from '../state/store.jsx';
import { useActor } from '../state/actor.jsx';

export function Respond() {
  const { task, request, setGates, openDetails } = useTask();
  const { state, dispatch } = useStore();
  const { actor } = useActor();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [val, setVal] = useState('');
  const all = state.comments[request.id] || [];
  // Review comments: everything a reviewer posted (not the requester's own notes).
  const list = all.filter((c) => c.author.name !== request.requester.name);
  const resolved = list.filter((c) => c.resolved).length;
  const edits = state.rfp[request.id]?.edits || {};
  useEffect(() => { setGates({ resubmit: resolved === list.length ? true : `Resolve all ${list.length} comments first.` }); }, [resolved, list.length]);
  const me = { ...actor, role: 'Requester' };
  const reply = (c, text) => dispatch({ type: 'comment', req: request.id, author: me, text, replyTo: c.id });
  const saveEdit = (c) => {
    const v = val.trim(); if (!v) return;
    dispatch({ type: 'rfp', req: request.id, patch: { edits: { ...edits, [c.anchor.id]: v } } });
    reply(c, `Field updated: ${c.anchor.label} → “${v}”`);
    setEditKey(null); setVal('');
  };

  return (
    <div className="stack" data-respond>
      <ReviewHeader title="Respond to the review comments" desc="Reply to or resolve each comment in the request details. Turn on editing to change the commented fields."
        done={resolved} total={list.length} noun={`comments resolved by ${actor.name}`} />
      <div className="banner warn">
        <Icon name="icon-return" size={16} />
        <div className="banner-text">
          <div className="t-body-medium">{task.fromTitle || 'A reviewer'} returned this request{task.returnedAt ? ` on ${task.returnedAt}` : ''}</div>
          {task.note && <div className="t-body-small">“{task.note}”</div>}
        </div>
      </div>
      <div className={`edit-mode${editing ? ' on' : ''}`}>
        {editing ? (
          <><Icon name="icon-pencil" size={16} /><div className="grow"><div className="t-body-medium">Editing is on — commented fields only</div><div className="t-body-small muted">Click Edit next to a comment marker to change that field. Other fields stay locked.</div></div><Btn variant="secondary-sm" onClick={() => { setEditing(false); setEditKey(null); }}>Done editing</Btn></>
        ) : (
          <><Icon name="icon-info" size={16} /><div className="grow t-body-small muted">Click a marker to reply or resolve. Turn on editing when you are ready to change the commented fields.</div><Btn variant="secondary-sm" icon="icon-pencil" onClick={() => setEditing(true)}>Enable editing</Btn></>
        )}
      </div>
      {!list.length && <p className="t-body-small muted">No comments on fields — check the reviewer’s note above, then resubmit.</p>}
      <ol className="resp-list">
        {list.map((c, i) => (
          <li key={c.id} className={`resp${c.resolved ? ' resolved' : ''}`}>
            <span className="resp-marker" aria-hidden="true">{i + 1}</span>
            <div className="grow">
              <div className="resp-top">
                {c.anchor ? <button type="button" className="tag resp-anchor" onClick={() => openDetails(false)} title="Open in Request details">{c.anchor.label}</button> : <span className="tag">General</span>}
                {c.resolved && <span className="state-tag ok">Review comment — resolved</span>}
              </div>
              <div className="resp-cmt"><Avatar person={c.author} size={22} tone="alt" /><span className="t-body-small"><strong>{c.author.name}</strong> <span className="muted">· {c.at}</span><br />{c.text}</span></div>
              {c.replies.map((r) => <div key={r.id} className="resp-cmt reply"><Avatar person={{ ...r.author, me: r.author.name === actor.name }} size={20} /><span className="t-body-small"><strong>{r.author.name}</strong> <span className="muted">· {r.at}</span><br />{r.text}</span></div>)}
              {c.anchor && edits[c.anchor.id] && <div className="t-caption brand-text">Field updated · now “{edits[c.anchor.id]}”</div>}
              {editKey === c.id && (
                <div className="resp-edit"><Input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={`New value for ${c.anchor.label}`} onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)} aria-label={`New value for ${c.anchor.label}`} /><Btn variant="primary-sm" disabled={!val.trim()} onClick={() => saveEdit(c)}>Save</Btn><Btn variant="ghost-sm" onClick={() => setEditKey(null)}>Cancel</Btn></div>
              )}
              {replying === c.id && <div className="resp-reply"><CommentBox placeholder="Reply to review comment…" onCancel={() => setReplying(null)} onSubmit={(t) => { reply(c, t); setReplying(null); }} /></div>}
              <div className="resp-actions">
                <Btn variant="ghost-sm" icon="icon-reply" onClick={() => setReplying(replying === c.id ? null : c.id)}>Reply</Btn>
                {editing && c.anchor && !c.resolved && <Btn variant="ghost-sm" icon="icon-pencil" onClick={() => { setEditKey(c.id); setVal(edits[c.anchor.id] || ''); }}>Edit</Btn>}
                <Btn variant={c.resolved ? 'ghost-sm' : 'secondary-sm'} icon={c.resolved ? 'icon-reopen' : 'icon-check-brand'} onClick={() => dispatch({ type: 'resolve', req: request.id, id: c.id })}>{c.resolved ? 'Reopen' : 'Mark resolved'}</Btn>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
