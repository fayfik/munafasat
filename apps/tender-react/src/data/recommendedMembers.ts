import type { Person } from '../types/tender';

/** Recommended committee members — people who have reviewed RFPs created in this
 *  project. Surfaced as the first section of the committee member picker. */
export interface RecMember extends Person {
  nameAr: string;
  roleAr: string;
  reviewed: number; // RFPs reviewed in this project
}

// Face-cropped stock headshots (Unsplash). `crop=faces` centres on the face.
const AV = (id: string) => `https://images.unsplash.com/photo-${id}?w=176&h=176&fit=crop&crop=faces&auto=format&q=80`;

export const RECOMMENDED_MEMBERS: RecMember[] = [
  { id: 'rec-khalid',   name: 'Khalid Al-Otaibi',   nameAr: 'خالد العتيبي',  role: 'Senior Solutions Architect',   roleAr: 'كبير مهندسي الحلول',             department: 'IT & Digital Transformation', initials: 'KA', avatarColor: '#1a6b38', reviewed: 4, photoUrl: AV('1756412066366-b46dafaca253') },
  { id: 'rec-abdullah', name: 'Abdullah Al-Harbi',  nameAr: 'عبدالله الحربي', role: 'Procurement Lead',             roleAr: 'قائد المشتريات',                department: 'Finance & Procurement',       initials: 'AH', avatarColor: '#2563eb', reviewed: 3, photoUrl: AV('1780776489912-aa89b69b8c59') },
  { id: 'rec-noura',    name: 'Noura Al-Qahtani',   nameAr: 'نورة القحطاني', role: 'Cybersecurity Officer',        roleAr: 'مسؤولة الأمن السيبراني',        department: 'Information Security',         initials: 'NQ', avatarColor: '#7c3aed', reviewed: 5, photoUrl: AV('1649399044844-9af065083b8a') },
  { id: 'rec-faisal',   name: 'Faisal Al-Dossari',  nameAr: 'فيصل الدوسري',  role: 'ERP Functional Manager',       roleAr: 'مدير وظيفي لنظام تخطيط الموارد', department: 'IT & Digital Transformation', initials: 'FD', avatarColor: '#d97706', reviewed: 2, photoUrl: AV('1756412066334-faa0ba38261f') },
  { id: 'rec-sara',     name: 'Sara Al-Zahrani',    nameAr: 'سارة الزهراني', role: 'Quality & Compliance Analyst', roleAr: 'محللة الجودة والامتثال',        department: 'PMO',                         initials: 'SZ', avatarColor: '#be123c', reviewed: 3, photoUrl: AV('1649399046939-7b8112221151') },
];
