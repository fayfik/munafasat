import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function CheckIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export function XIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export function SparklesIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  );
}

export function PlusIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}

export function TrashIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export function PencilIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  );
}

export function ChevronRightIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export function ChevronDownIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export function UploadIcon({ className = 'w-5 h-5', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export function AlertTriangleIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export function InfoIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}

export function CheckCircleIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export function CircleIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}>
      <circle cx="10" cy="10" r="7" />
    </svg>
  );
}

export function ExclamationCircleIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export function DocumentIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  );
}

export function ClockIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  );
}

export function DownloadIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export function SearchIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  );
}

export function GridIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

export function BellIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  );
}

export function HomeIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

export function ListIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export function ChevronUpIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  );
}

export function SunIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
  );
}

export function MoonIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" {...p}>
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );
}

export function PanelLeftIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" {...p}>
      <rect x="2" y="3" width="16" height="14" rx="2" />
      <line x1="7" y1="3" x2="7" y2="17" />
    </svg>
  );
}

export function TableIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3.5" width="14" height="13" rx="2" />
      <path d="M3 8h14M3 12.25h14M8 8v8.5" />
    </svg>
  );
}

/** SIDF brand mark (icon only), vector version of the logo symbol. */
export function SidfMark({ className = '', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 82 56" fill="currentColor" aria-hidden="true" {...p}>
      <path d="M36 4 L22 28 L29 40 L38 40 L31 28 L41 12 L59 12 L68 28 L59 44 L55 44 L50.5 52 L64 52 L78 28 L64 4Z M46 52 L60 28 L53 16 L44 16 L51 28 L41 44 L23 44 L14 28 L23 12 L27 12 L31.5 4 L18 4 L4 28 L18 52Z" />
    </svg>
  );
}

export function WandIcon({ className = 'w-4 h-4', ...p }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3.5 16.5l9-9M11 6l3 3" />
      <path d="M15 2.5v2.5M13.75 3.75h2.5M16.5 9.5v2M15.5 10.5h2M8 2.5v1.5M7.25 3.25h1.5" />
    </svg>
  );
}

// ── Main navigation icons (Remix icon set, from the Munafasat repo's assets/icons).
// Each has an outline version and a filled version for the active page.
type NavIconProps = IconProps & { filled?: boolean };

export function NavDashboardIcon({ filled, className = 'w-[18px] h-[18px]', ...p }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      {filled
        ? <path d="M12 3C12.5523 3 13 3.44771 13 4L13 10C13 10.5523 12.5523 11 12 11L4 11C3.44772 11 3 10.5523 3 10L3 4C3 3.44772 3.44772 3 4 3L12 3ZM20 3C20.5523 3 21 3.44771 21 4L21 10C21 10.5523 20.5523 11 20 11L16 11C15.4477 11 15 10.5523 15 10L15 4C15 3.44771 15.4477 3 16 3L20 3ZM20 13C20.5523 13 21 13.4477 21 14L21 20C21 20.5523 20.5523 21 20 21L12 21C11.4477 21 11 20.5523 11 20L11 14C11 13.4477 11.4477 13 12 13L20 13ZM3 14C3 13.4477 3.44772 13 4 13L8 13C8.55229 13 9 13.4477 9 14L9 20C9 20.5523 8.55229 21 8 21L4 21C3.44772 21 3 20.5523 3 20L3 14Z" />
        : <path d="M3 10C3 10.5523 3.44772 11 4 11L12 11C12.5523 11 13 10.5523 13 10V4C13 3.44772 12.5523 3 12 3H4C3.44772 3 3 3.44772 3 4V10ZM11 20C11 20.5523 11.4477 21 12 21H20C20.5523 21 21 20.5523 21 20V14C21 13.4477 20.5523 13 20 13H12C11.4477 13 11 13.4477 11 14V20ZM13 15H19V19H13V15ZM3 20C3 20.5523 3.44772 21 4 21H8C8.55229 21 9 20.5523 9 20V14C9 13.4477 8.55229 13 8 13H4C3.44772 13 3 13.4477 3 14V20ZM5 19V15H7V19H5ZM5 9V5L11 5L11 9L5 9ZM20 11C20.5523 11 21 10.5523 21 10V4C21 3.44772 20.5523 3 20 3H16C15.4477 3 15 3.44772 15 4V10C15 10.5523 15.4477 11 16 11H20ZM19 9H17V5H19V9Z" />}
    </svg>
  );
}

export function NavRequestsIcon({ filled, className = 'w-[18px] h-[18px]', ...p }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      {filled
        ? <path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM8 7V9H16V7H8ZM8 11V13H16V11H8ZM8 15V17H16V15H8Z" />
        : <path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM8 7H16V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z" />}
    </svg>
  );
}

export function NavInboxIcon({ filled, className = 'w-[18px] h-[18px]', ...p }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      {filled
        ? <path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12H20V5H4V12H9Z" />
        : <path d="M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM7.41604 14H4V19H20V14H16.584C15.8124 15.7659 14.0503 17 12 17C9.94968 17 8.1876 15.7659 7.41604 14ZM20 5H4V12H9C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12H20V5Z" />}
    </svg>
  );
}

export function NavReportsIcon({ filled, className = 'w-[18px] h-[18px]', ...p }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
      {filled
        ? <path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z" />
        : <path d="M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z" />}
    </svg>
  );
}
