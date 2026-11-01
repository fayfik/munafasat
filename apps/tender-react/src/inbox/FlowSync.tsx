// Keeps each submitted request's status in My Requests in step with its live approval flow.
import { useEffect } from 'react';
import { useInbox } from './store';
import { useRequests, type SavedRequest } from '../context/RequestStore';
import { flowStatus } from './flow';
import type { TenderStatus } from '../types/tender';

export default function FlowSync() {
  const { tasks } = useInbox();
  const { requests, updateSessionDraft } = useRequests();
  useEffect(() => {
    for (const r of requests as SavedRequest[]) {
      const fs = flowStatus(tasks, r.requestNo);
      if (!fs) continue;
      const cur = fs.current[0];
      const parallel = fs.current.length > 1;
      const flow: NonNullable<SavedRequest['flow']> = {
        state: fs.state, done: fs.done, total: fs.total, respondTaskId: fs.respondTask?.id,
        stageEn: parallel ? `${fs.current.length} reviews in parallel` : cur?.stageEn ?? 'Approved',
        stageAr: parallel ? `${fs.current.length} مراجعات بالتوازي` : cur?.stageAr ?? 'معتمد',
        who: parallel ? fs.current.map((t) => t.assignee.name).join(', ') : cur?.assignee.name ?? '',
      };
      const status: TenderStatus = fs.state === 'approved' ? 'approved' : fs.state === 'in-review' ? 'under-review' : 'returned';
      if (r.status === status && JSON.stringify(r.flow) === JSON.stringify(flow)) continue;
      updateSessionDraft(r.id, { status, flow });
    }
  }, [tasks, requests, updateSessionDraft]);
  return null;
}
