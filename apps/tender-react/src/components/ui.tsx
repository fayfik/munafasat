import { useState, useRef, useEffect, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import React from 'react';
import { SparklesIcon, XIcon, SearchIcon, CheckIcon, ChevronDownIcon } from './Icons';
import { PEOPLE } from '../data/mockData';
import { RECOMMENDED_MEMBERS } from '../data/recommendedMembers';
import type { Person } from '../types/tender';
import { useLanguage, useT } from '../context/LanguageContext';

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'assets' | 'services' | 'consumables' | 'draft' | 'submitted' | 'approved' | 'rejected';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default:     'bg-neutral-100 text-neutral-600 border-neutral-200',
  success:     'bg-success-50 text-success-700 border-success-100',
  warning:     'bg-warning-50 text-warning-700 border-warning-100',
  error:       'bg-error-50 text-error-700 border-error-100',
  info:        'bg-blue-50 text-blue-700 border-blue-100',
  ai:          'bg-ai-50 text-ai-700 border-ai-100',
  assets:      'bg-purple-50 text-purple-700 border-purple-100',
  services:    'bg-blue-50 text-blue-700 border-blue-100',
  consumables: 'bg-orange-50 text-orange-700 border-orange-100',
  // Request status chips (Munafasat tokens)
  draft:       'bg-chip-draft-bg text-chip-draft-text border-transparent',
  submitted:   'bg-chip-submitted-bg text-chip-submitted-text border-transparent',
  approved:    'bg-chip-approved-bg text-chip-approved-text border-transparent',
  rejected:    'bg-chip-rejected-bg text-chip-rejected-text border-transparent',
};

export function Badge({ variant = 'default', children, className = '' }: { variant?: BadgeVariant; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border tracking-wide ${BADGE_STYLES[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';

const BTN_BASE = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';
const BTN_SM  = 'px-3 py-1.5 text-[12px]';
const BTN_MD  = 'px-4 py-2 text-[13px]';
const BTN_LG  = 'px-5 py-2.5 text-[13px]';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500 shadow-sm',
  secondary: 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 active:bg-neutral-100 focus-visible:ring-neutral-400 shadow-sm',
  ghost:     'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-400',
  danger:    'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500 shadow-sm',
  ai:        'bg-ai-50 text-ai-700 border border-ai-200 hover:bg-ai-100 active:bg-ai-100 focus-visible:ring-ai-500',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  const sz = size === 'sm' ? BTN_SM : size === 'lg' ? BTN_LG : BTN_MD;
  return (
    <button className={`${BTN_BASE} ${sz} ${BTN_VARIANT[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <LoadingSpinner /> : null}
      {children}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-3.5 h-3.5 spin-slow" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── AI Button ────────────────────────────────────────────────────────────────

interface AIButtonProps {
  onClick: () => void;
  loading: boolean;
  label?: string;
  className?: string;
}

export function AIButton({ onClick, loading, label, className = '' }: AIButtonProps) {
  const t = useT();
  const defaultLabel = t('Generate with AI', 'توليد بالذكاء الاصطناعي');
  const displayLabel = label ?? defaultLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-ai-50 text-ai-700 border border-ai-200 hover:bg-ai-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <SparklesIcon className={`w-3.5 h-3.5 ${loading ? 'spin-slow' : ''}`} />
      {loading ? t('Generating…', 'جاري التوليد…') : displayLabel}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

const INPUT_BASE =
  'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-md text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400 read-only:bg-neutral-50 read-only:text-neutral-500 read-only:cursor-default';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ className = '', error, ...props }: InputProps) {
  return (
    <div>
      <input className={`${INPUT_BASE} ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-[11px] text-error-600">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ className = '', error, ...props }: TextareaProps) {
  return (
    <div>
      <textarea
        className={`${INPUT_BASE} resize-y ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-[11px] text-error-600">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
// Custom in-flow implementation: options render as a block list so the parent
// section expands naturally instead of the OS dropdown floating outside the DOM.

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  error?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

export function Select({ className = '', error, children, value, onChange, disabled, ...props }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse <option> children into { value, label, disabled } records
  type Opt = { value: string; label: string; disabled?: boolean };
  const options: Opt[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const el = child as React.ReactElement<{ value?: string; children?: ReactNode; disabled?: boolean }>;
    options.push({
      value: String(el.props.value ?? ''),
      label: React.Children.toArray(el.props.children).join(''),
      disabled: el.props.disabled,
    });
  });

  const selected = options.find((o) => o.value === String(value ?? ''));
  const isPlaceholder = !value || value === '';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function pick(v: string) {
    onChange?.({ target: { value: v } });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${INPUT_BASE} flex items-center justify-between gap-2 text-start cursor-pointer ${
          isPlaceholder ? 'text-neutral-400' : 'text-neutral-900'
        } ${error ? 'border-error-500' : ''} ${disabled ? 'bg-neutral-50 text-neutral-400 cursor-default' : ''} ${className}`}
      >
        <span className="flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronDownIcon
          className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && options.length > 0 && (
        <div className="mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-sm slide-up">
          <ul className="py-1">
            {options.map((opt, i) => {
              const isSelected = opt.value === String(value ?? '');
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && pick(opt.value)}
                    className={`w-full text-start px-4 py-2.5 text-body-md transition-colors ${
                      isSelected
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : opt.disabled
                        ? 'text-neutral-400 cursor-default'
                        : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-error-600">{error}</p>}
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  labelAr?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  readOnly?: boolean;
  action?: ReactNode;
}

export function FormField({ label, labelAr, required, optional, hint, error, children, className = '', readOnly, action }: FormFieldProps) {
  const { isAr } = useLanguage();
  const t = useT();

  const primaryLabel = isAr && labelAr ? labelAr : label;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-1.5 text-label-lg font-medium text-neutral-800 flex-wrap">
          {primaryLabel}
          {optional && <span className="text-neutral-500 font-normal text-[11px]">{t('Optional', 'اختياري')}</span>}
          {readOnly && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-normal">
              <LockIcon />
              {t('Auto-fetched', 'مجلوب تلقائياً')}
            </span>
          )}
        </label>
        {action}
      </div>
      {hint && <p className="text-body-sm text-neutral-500 leading-relaxed">{hint}</p>}
      {children}
      {error && <p className="text-[11px] text-error-600 flex items-center gap-1 mt-1">{error}</p>}
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SectionCard({ title, titleAr, description, descriptionAr, children, className = '', action }: SectionCardProps) {
  const { isAr } = useLanguage();
  const displayTitle = isAr && titleAr ? titleAr : title;
  const displayDesc = isAr && descriptionAr ? descriptionAr : description;

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm ${className}`}>
      {(displayTitle || action) && (
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <div className="flex-1 min-w-0 pe-3">
            {displayTitle && (
              <h3 className="text-title-xxs font-semibold text-neutral-900 leading-tight">{displayTitle}</h3>
            )}
            {displayDesc && (
              <p className="mt-1 text-body-sm text-neutral-500 leading-relaxed">{displayDesc}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── ReadOnlyField ────────────────────────────────────────────────────────────

export function ReadOnlyField({ value, className = '' }: { value: string; className?: string }) {
  return (
    <div className={`min-h-[38px] rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-body-md text-neutral-600 leading-relaxed ${className}`}>
      {value || <span className="text-neutral-400 italic">—</span>}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/** Round avatar: shows the person's photo when present, otherwise initials on their
 *  brand colour. Falls back to initials if the remote image fails to load. */
export function Avatar({
  person,
  className = '',
  textClass = 'text-[12px]',
}: {
  person: { initials: string; avatarColor: string; photoUrl?: string };
  className?: string;
  textClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (person.photoUrl && !failed) {
    return (
      <img
        src={person.photoUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} object-cover bg-neutral-100`}
      />
    );
  }
  return (
    <span
      className={`${className} inline-flex items-center justify-center text-white font-semibold ${textClass}`}
      style={{ background: person.avatarColor }}
      aria-hidden="true"
    >
      {person.initials}
    </span>
  );
}

// ─── PeoplePicker ─────────────────────────────────────────────────────────────

interface PeoplePickerProps {
  value: Person[];
  onChange: (people: Person[]) => void;
  placeholder?: string;
  label?: string;
}

export function PeoplePicker({ value, onChange, placeholder, label }: PeoplePickerProps) {
  const { isAr } = useLanguage();
  const t = useT();
  const defaultPlaceholder = t('Search and add members…', 'ابحث وأضف أعضاء…');
  const resolvedPlaceholder = placeholder ?? defaultPlaceholder;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const added = (id: string) => value.some((v) => v.id === id);
  const match = (p: Person & { nameAr?: string; roleAr?: string }) =>
    !q || [p.name, p.nameAr, p.role, p.roleAr, p.department].filter(Boolean).some((s) => s!.toLowerCase().includes(q));
  const recRows = RECOMMENDED_MEMBERS.filter((m) => !added(m.id) && match(m));
  const otherRows = PEOPLE.filter((p) => !added(p.id) && !RECOMMENDED_MEMBERS.some((m) => m.id === p.id) && match(p));
  const hasResults = recRows.length > 0 || otherRows.length > 0;
  const dispName = (p: Person) => (isAr && p.nameAr ? p.nameAr : p.name);
  const dispRole = (p: Person & { roleAr?: string }) => (isAr && p.roleAr ? p.roleAr : p.role);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const add = (person: Person) => {
    onChange([...value, person]);
    setQuery('');
    setOpen(false);
  };

  const remove = (id: string) => {
    onChange(value.filter((p) => p.id !== id));
  };

  return (
    <div>
      {label && <label className="block text-label-lg font-medium text-neutral-800 mb-1.5">{label}</label>}
      <div ref={containerRef}>
        <div className="flex flex-wrap gap-2 min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          {value.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 rounded-full ps-1 pe-2 py-0.5 text-[12px] text-neutral-700">
              <Avatar person={p} className="w-5 h-5 rounded-full flex-shrink-0" textClass="text-[10px]" />
              {dispName(p)}
              <button type="button" onClick={() => remove(p.id)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          <div className="relative flex-1 flex items-center min-w-[140px]">
            <SearchIcon className={`w-3.5 h-3.5 text-neutral-400 absolute ${isAr ? 'right-0' : 'left-0'} pointer-events-none`} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={value.length === 0 ? resolvedPlaceholder : t('Add more…', 'أضف المزيد…')}
              className={`${isAr ? 'pr-5' : 'pl-5'} bg-transparent border-none outline-none text-body-md text-neutral-700 placeholder-neutral-400 w-full`}
            />
          </div>
        </div>
        {open && hasResults && (
          <div className="mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden slide-up max-h-[20rem] overflow-y-auto">
            {/* Recommended members */}
            {recRows.length > 0 && (
              <div>
                <p className="px-4 pt-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ai-700 bg-ai-50/60 flex items-center gap-1.5">
                  <SparklesIcon className="w-3 h-3" /> {t('Recommended members', 'أعضاء مقترحون')}
                </p>
                <ul className="py-1">
                  {recRows.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => add(m)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-body-md hover:bg-neutral-50 transition-colors">
                        <Avatar person={m} className="w-8 h-8 rounded-full flex-shrink-0 ring-1 ring-black/5" textClass="text-[12px]" />
                        <div className="text-start flex-1 min-w-0">
                          <p className="font-medium text-neutral-900 truncate">{dispName(m)}</p>
                          <p className="text-neutral-500 text-[11px] truncate">{dispRole(m)} · {m.department}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-ai-700 bg-ai-100/70 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                          <SparklesIcon className="w-2.5 h-2.5" /> {t(`${m.reviewed} RFP${m.reviewed > 1 ? 's' : ''} reviewed`, `راجع ${m.reviewed} طلب`)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Other members */}
            {otherRows.length > 0 && (
              <div>
                {recRows.length > 0 && (
                  <p className="px-4 pt-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400 border-t border-neutral-100">
                    {t('Other members', 'أعضاء آخرون')}
                  </p>
                )}
                <ul className="py-1">
                  {otherRows.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => add(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-body-md hover:bg-neutral-50 transition-colors">
                        <Avatar person={p} className="w-8 h-8 rounded-full flex-shrink-0" textClass="text-[12px]" />
                        <div className="text-start flex-1 min-w-0">
                          <p className="font-medium text-neutral-900 truncate">{dispName(p)}</p>
                          <p className="text-neutral-500 text-[11px] truncate">{dispRole(p)} · {p.department}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {open && !hasResults && query && (
          <div className="mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-sm px-4 py-3 text-body-md text-neutral-500 slide-up">
            {t('No matching people found.', 'لا توجد نتائج مطابقة.')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InfoBanner ───────────────────────────────────────────────────────────────

export function InfoBanner({ children, variant = 'info', className = '' }: { children: ReactNode; variant?: 'info' | 'warning' | 'success' | 'ai'; className?: string }) {
  const styles = {
    info:    'bg-ai-50 border-ai-200 text-ai-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    success: 'bg-success-50 border-success-200 text-success-700',
    ai:      'bg-ai-50 border-ai-200 text-ai-800',
  };
  return (
    <div className={`flex gap-2.5 rounded-lg border px-4 py-3 text-body-sm leading-relaxed ${styles[variant]} ${className}`}>
      {(variant === 'ai' || variant === 'info') && <SparklesIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-ai-600" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-neutral-200 ${className}`} />;
}
