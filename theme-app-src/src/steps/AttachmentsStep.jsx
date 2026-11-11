import { useRef, useState } from 'react';
import { Icon } from '../components/ui.jsx';
import { useForm, Block } from '../components/FormKit.jsx';

const OK = /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|csv|txt|zip)$/i;
const MAX = 10 * 1024 * 1024;
export const fileExt = (n) => (n.split('.').pop() || '').toLowerCase().replace('jpeg', 'jpg');
export const fileSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function AttachmentsStep() {
  const { f, list } = useForm();
  const files = list('attachments');
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');

  const add = (fl) => {
    const bad = [];
    [...fl].forEach((file) => {
      if (!OK.test(file.name)) bad.push(`${file.name}: unsupported file type`);
      else if (file.size > MAX) bad.push(`${file.name}: larger than 10 MB`);
      else files.add({ name: file.name, size: file.size, mimeType: file.type, uploadedAt: new Date().toISOString() });
    });
    setErr(bad.join(' · '));
  };

  return (
    <div className="stack">
      <p className="lede t-body muted">Optional. Add anything that helps reviewers and vendors — drawings, existing contracts, reference specifications.</p>
      <Block title="Supporting documents" meta={f.attachments.length ? `${f.attachments.length} file${f.attachments.length === 1 ? '' : 's'}` : undefined}>
        <div className={`dropzone big${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
          <Icon name="icon-file-tile" size={32} />
          <span className="t-body">{over ? 'Release to upload' : <>Drag files here, or <button type="button" className="inline-link" onClick={() => ref.current?.click()}>browse</button></>}</span>
          <span className="t-caption muted">PDF, Word, Excel, PowerPoint, images · up to 10 MB each</span>
          <input ref={ref} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        </div>
        {err && <p className="ffield-error t-body-small" role="alert">{err}</p>}
        {f.attachments.length > 0 && (
          <ul className="file-list" style={{ marginTop: 12 }}>
            {f.attachments.map((a) => (
              <li key={a.id}>
                <span className={`file-type t-${fileExt(a.name)}`}>{fileExt(a.name).toUpperCase()}</span>
                <span className="file-name"><span className="t-body">{a.name}</span><span className="t-caption muted">{fileSize(a.size)} · added {new Date(a.uploadedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></span>
                <button type="button" className="icon-btn" aria-label={`Remove ${a.name}`} onClick={() => files.remove(a.id)}><Icon name="icon-x" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}
