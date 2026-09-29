import { useState, useRef, useCallback } from 'react';
import { useTender } from '../context/TenderContext';
import { useT } from '../context/LanguageContext';
import { SectionCard } from '../components/ui';
import { UploadIcon, TrashIcon } from '../components/Icons';
import type { FileAttachment } from '../types/tender';

const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png'];
const MAX_SIZE_MB = 20;

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.includes('pdf')) return '📄';
  if (type.includes('word')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📋';
  if (type.includes('image')) return '🖼️';
  return '📁';
}

export default function Attachments() {
  const { formData, addAttachment, removeAttachment } = useTender();
  const t = useT();
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFiles(files: FileList) {
    const newErrors: string[] = [];
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
        newErrors.push(`${file.name}: ${t('Unsupported file type.', 'نوع الملف غير مدعوم.')}`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        newErrors.push(`${file.name}: ${t(`File exceeds ${MAX_SIZE_MB}MB limit.`, `الملف يتجاوز الحد الأقصى ${MAX_SIZE_MB} ميجابايت.`)}`);
        return;
      }
      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };
      addAttachment(attachment);
    });
    setErrors(newErrors);
    if (newErrors.length) setTimeout(() => setErrors([]), 5000);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [addAttachment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };

  const fileCount = formData.attachments.length;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Supporting Documents"
        titleAr="الوثائق الداعمة"
        description="Upload all relevant documents to support this tender request."
        descriptionAr="ارفع جميع الوثائق ذات الصلة لدعم طلب المناقصة هذا."
      >
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center ${
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
            onChange={handleChange}
            className="absolute inset-0 opacity-0 pointer-events-none"
          />
          <UploadIcon className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-brand-500' : 'text-neutral-300'}`} />
          <p className="text-sm font-medium text-neutral-700">
            {dragOver ? t('Release to upload', 'أفلت لرفع الملف') : t('Drag & drop files here', 'اسحب وأفلت الملفات هنا')}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {t('or', 'أو')} <span className="text-brand-600 font-medium">{t('click to browse', 'انقر للتصفح')}</span>
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            PDF, Word, Excel, PowerPoint, {t('Images', 'صور')} · {t('Max', 'الحد الأقصى')} {MAX_SIZE_MB}MB {t('per file', 'لكل ملف')}
          </p>
        </div>

        {/* Errors */}
        {errors.map((err, i) => (
          <div key={i} className="mt-2 text-xs text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{err}</div>
        ))}

        {/* File list */}
        {fileCount > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {fileCount} {fileCount > 1 ? t('files attached', 'ملفات مرفقة') : t('file attached', 'ملف مرفق')}
            </p>
            {formData.attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-4 py-3 group hover:border-neutral-300 transition-colors slide-up">
                <span className="text-xl flex-shrink-0">{fileIcon(att.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{att.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {fileSize(att.size)} · {t('Uploaded', 'رُفع')} {new Date(att.uploadedAt).toLocaleDateString('en-SA')}
                  </p>
                </div>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-error-500 transition-all flex-shrink-0"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {fileCount === 0 && (
          <div className="mt-4 text-center py-4 text-xs text-neutral-400">
            {t('No files uploaded yet.', 'لم يتم رفع أي ملفات بعد.')}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
