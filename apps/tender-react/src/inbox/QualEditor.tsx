// Qualification task: the request-creation "Qualification Criteria" step, embedded
// as-is (same component, same validation). Changes are kept on the task, never
// written back to the request store from here.
import { useEffect } from 'react';
import { TenderProvider, useTender } from '../context/TenderContext';
import QualificationCriteria from '../sections/QualificationCriteria';
import type { Task } from './types';
import type { TenderFormData } from '../types/tender';

function Reporter({ onChange }: { onChange: (f: NonNullable<Task['qualForm']>) => void }) {
  const { formData } = useTender();
  useEffect(() => {
    onChange({ criteria: formData.qualificationCriteria, members: formData.qualificationCommitteeMembers });
  }, [formData.qualificationCriteria, formData.qualificationCommitteeMembers]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function QualEditor({ task, onChange, readOnly }: { task: Task; onChange: (f: NonNullable<Task['qualForm']>) => void; readOnly?: boolean }) {
  const seed = (task.qualForm
    ? { qualificationCriteria: task.qualForm.criteria, qualificationCommitteeMembers: task.qualForm.members }
    : {}) as unknown as TenderFormData;
  return (
    <div className={readOnly ? 'pointer-events-none opacity-80' : ''} data-qual-editor>
      <TenderProvider key={task.id} noPersist initialSeed={seed}>
        <QualificationCriteria />
        <Reporter onChange={onChange} />
      </TenderProvider>
    </div>
  );
}
