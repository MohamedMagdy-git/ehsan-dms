'use client';

import React from 'react';
import { useApp } from '@/context/app-context';
import {
  HeartHandshake,
  CheckCircle2,
  ShieldCheck,
  Plus,
  ArrowRight,
  Sparkles,
  Heart,
} from 'lucide-react';
import { RoleInspirationalCard } from '@/components/common/role-inspirational-card';

// Emblem types for anonymous community contributions
export type CommunityEmblemType = 'lion' | 'falcon' | 'lantern' | 'tree' | 'palm';

interface CommunityEmblemConfig {
  type: CommunityEmblemType;
  title: string;
  badgeText: string;
  containerBg: string;
  borderColor: string;
  ringColor: string;
}

const EMBLEM_CONFIGS: Record<CommunityEmblemType, CommunityEmblemConfig> = {
  lion: {
    type: 'lion',
    title: 'رأس أسد ذهبي',
    badgeText: 'رمز الجود والشجاعة',
    containerBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/70',
    borderColor: 'border-amber-300',
    ringColor: 'ring-1 ring-amber-400/30',
  },
  falcon: {
    type: 'falcon',
    title: 'صقر شامخ',
    badgeText: 'رمز العزة والهمة',
    containerBg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/70',
    borderColor: 'border-emerald-300',
    ringColor: 'ring-1 ring-emerald-400/30',
  },
  lantern: {
    type: 'lantern',
    title: 'فانوس مضيء',
    badgeText: 'رمز النور والأمل',
    containerBg: 'bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-100/70',
    borderColor: 'border-amber-300',
    ringColor: 'ring-1 ring-amber-400/30',
  },
  tree: {
    type: 'tree',
    title: 'شجرة عطاء',
    badgeText: 'رمز النماء والبركة',
    containerBg: 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100/70',
    borderColor: 'border-emerald-300',
    ringColor: 'ring-1 ring-emerald-400/30',
  },
  palm: {
    type: 'palm',
    title: 'نخلة الجود',
    badgeText: 'رمز الخير والظلال',
    containerBg: 'bg-gradient-to-br from-teal-50 via-emerald-50 to-amber-50',
    borderColor: 'border-teal-300',
    ringColor: 'ring-1 ring-teal-400/30',
  },
};

const EMBLEM_SEQUENCE: CommunityEmblemType[] = ['lion', 'falcon', 'lantern', 'tree', 'palm'];

function getEmblemForDonation(id: string, index: number): CommunityEmblemConfig {
  let hash = index;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % EMBLEM_SEQUENCE.length;
  }
  const key = EMBLEM_SEQUENCE[hash % EMBLEM_SEQUENCE.length];
  return EMBLEM_CONFIGS[key];
}

// Crisp Vector Emblems (SVG)
function LionVector() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.2l1.6 2.2 2.7-.8-.3 2.8 2.6 1.1-1.3 2.5 2.2 1.8-2.1 1.9.9 2.7-2.7.7-.6 2.7-2.6-.9-2 1.9-2-1.9-2.6.9-.6-2.7-2.7-.7.9-2.7-2.1-1.9 2.2-1.8-1.3-2.5 2.6-1.1-.3-2.8 2.7.8L12 2.2z"
        fill="#FEF3C7"
        stroke="#D97706"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5v2c0 2.2-1.6 4-3.5 4S8.5 14.2 8.5 12v-2z"
        fill="#FDE68A"
        stroke="#B45309"
        strokeWidth="1"
      />
      <path d="M11 6.5l1-1.2 1 1.2-1 .4-1-.4z" fill="#D97706" />
      <ellipse cx="10.3" cy="10.8" rx="0.9" ry="0.7" fill="#78350F" />
      <ellipse cx="13.7" cy="10.8" rx="0.9" ry="0.7" fill="#78350F" />
      <polygon points="12,12.2 11.2,13.2 12.8,13.2" fill="#B45309" />
      <path d="M10.2 14.2c.8.5 1.8.5 2.6 0" stroke="#92400E" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function FalconVector() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.5 3.5c2.8 0 5.5 1.8 6.5 5 1 3.2.2 6.5-1.8 8.8l-2.2-.8c-.5 2-2 3.5-4 4-2.2.5-4.5-.2-6-1.8 1.2-.8 1.8-2.2 1.8-3.8 0-1.8-.8-3.5-1.8-5 1.8-4 4.5-6.4 7.5-6.4z"
        fill="#D1FAE5"
        stroke="#047857"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M17 8.5c1.6.4 3 1.4 3.5 2.8-.8.6-2.2.7-3.5-.2z"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="8.2" r="1.8" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
      <circle cx="12.5" cy="8.2" r="0.8" fill="#064E3B" />
      <path d="M8 11.5c1.5 1.2 3.2 1.6 5 1.2" stroke="#059669" strokeWidth="1" strokeLinecap="round" />
      <path d="M7 8.5c1.2.6 2.5.8 3.8.5" stroke="#059669" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function LanternVector() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="3" r="1.5" stroke="#D97706" strokeWidth="1.2" />
      <path d="M9 5.5h6l1.2 2.5H7.8L9 5.5z" fill="#FDE68A" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7.8 8l1.4 7.5h5.6L16.2 8H7.8z" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 10c-.9 1.2-.9 2.4 0 3.3.9-.9.9-2.1 0-3.3z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
      <path d="M9.2 15.5h5.6l.8 2.5H8.4l.8-2.5z" fill="#FDE68A" stroke="#D97706" strokeWidth="1" strokeLinejoin="round" />
      <rect x="10" y="18" width="4" height="1" rx="0.5" fill="#B45309" />
      <path d="M4 11h2M18 11h2M5 7l1.5 1.5M17.5 15l1.5 1.5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TreeVector() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.8c-2.8 0-4.8 1.8-4.8 4.2 0 .6.2 1.2.5 1.8C6.2 9.5 5 10.8 5 12.8c0 2.2 1.8 3.4 4.2 3.4h5.6c2.4 0 4.2-1.2 4.2-3.4 0-2-1.2-3.3-2.7-4 .3-.6.5-1.2.5-1.8 0-2.4-2-4.2-4.8-4.2z"
        fill="#D1FAE5"
        stroke="#047857"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M11 16.2v4.8M13 16.2v4.8M9 21h6" stroke="#78350F" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 11.5v4.5" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="10" cy="7.5" r="1.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="14" cy="7.5" r="1.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="8" cy="12" r="1.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="16" cy="12" r="1.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
      <circle cx="12" cy="10" r="1.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    </svg>
  );
}

function PalmVector() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 9.5c-.6 3.5-.9 7.5-1.5 11.5M12.5 21h-2" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 9.5C8.8 8.5 6.5 6.2 6.5 3.5c2.8.5 5 2.8 5.5 6z" fill="#CCFBF1" stroke="#0F766E" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M12 9.5c3.2-1 5.5-3.3 5.5-6-2.8.5-5 2.8-5.5 6z" fill="#CCFBF1" stroke="#0F766E" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M12 9.5c-3 1.5-6.2 1.5-8 .5 1.5-2.2 4.8-2.2 8-.5z" fill="#D1FAE5" stroke="#047857" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M12 9.5c3 1.5 6.2 1.5 8 .5-1.5-2.2-4.8-2.2-8-.5z" fill="#D1FAE5" stroke="#047857" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="1" fill="#FBBF24" stroke="#D97706" strokeWidth="0.6" />
      <circle cx="13" cy="11" r="1" fill="#FBBF24" stroke="#D97706" strokeWidth="0.6" />
    </svg>
  );
}

function CommunityEmblemRenderer({ type }: { type: CommunityEmblemType }) {
  switch (type) {
    case 'lion':
      return <LionVector />;
    case 'falcon':
      return <FalconVector />;
    case 'lantern':
      return <LanternVector />;
    case 'tree':
      return <TreeVector />;
    case 'palm':
      return <PalmVector />;
    default:
      return <LanternVector />;
  }
}

export function DonorPortalView() {
  const {
    donations,
    activeDonorId,
    setActiveDonorId,
    currentAllocation,
    setIsNewDonationModalOpen,
    setActiveSection,
    currentSessionProfile,
  } = useApp();

  // Distinct donors list for session simulation
  const donorsList = [
    { id: 'donor-ahmed-hossam', name: 'م. أحمد حسام الدين (صندوق عام)' },
    { id: 'donor-mona-elsharif', name: 'د. منى الشريف (مقيد رعاية طبية)' },
    { id: 'donor-hesham-abdelmoneim', name: 'م. هشام عبد المنعم (مقيد لحالة بالاسم)' },
    { id: 'donor-anonymous-alex', name: 'فاعل خير - الإسكندرية (مقيد كفالة أيتام)' },
    { id: 'donor-sara-eldeeb', name: 'د. سارة الديب (مقيد سكن وترميم)' },
  ];

  const donorDonations = donations.filter((d) => d.donorId === activeDonorId);
  const totalDonated = donorDonations.reduce((sum, d) => sum + d.amount, 0);

  // Anonymized community donations feed for encouragement
  const anonymousCommunityDonations = [
    {
      id: 'anon-1',
      alias: 'فاعل خير - م. ح.',
      location: 'القاهرة الجديدة',
      amount: 15000,
      purpose: 'دعم الصندوق العام لكفالة الأسر الأشد احتياجاً',
      category: 'عام',
      date: 'منذ يومين',
      badge: 'مساهمة كريمة',
    },
    {
      id: 'anon-2',
      alias: 'محسنة كريمة - د. م.',
      location: 'الدقي',
      amount: 8000,
      purpose: 'رعاية طبية وأدوية شهرية للأمراض المزمنة',
      category: 'طبي',
      date: 'منذ 3 أيام',
      badge: 'رعاية علاجية',
    },
    {
      id: 'anon-3',
      alias: 'محب للخير والبر',
      location: 'الإسكندرية',
      amount: 12000,
      purpose: 'كفالة أيتام ودعم تعليمي شهري للأسر',
      category: 'أيتام',
      date: 'منذ 4 أيام',
      badge: 'كفالة أيتام',
    },
    {
      id: 'anon-4',
      alias: 'صدقة جارية عن الوالدين',
      location: 'مدينة نصر',
      amount: 6500,
      purpose: 'تأهيل سكن ودعم معيشي عاجل للأسر المتعففة',
      category: 'سكن',
      date: 'منذ 5 أيام',
      badge: 'صدقة جارية',
    },
    {
      id: 'anon-5',
      alias: 'فاعل خير كريم',
      location: 'المعادي',
      amount: 20000,
      purpose: 'سداد فجوات الاحتياج الشهري لـ 5 أسر متعففة',
      category: 'عام',
      date: 'منذ أسبوع',
      badge: 'كفالة جماعية',
    },
    {
      id: 'anon-6',
      alias: 'أم عبد الرحمن',
      location: 'الشيخ زايد',
      amount: 9500,
      purpose: 'تجهيز فتيات أيتام وتوفير أجهزة معيشية أساسية',
      category: 'أيتام',
      date: 'منذ 8 أيام',
      badge: 'عطاء مبارك',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Return Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">بوابة وخدمات المتبرعين</h2>
            <p className="text-[11px] text-slate-500">
              تقارير الشفافية وإدارة حسابات الداعمين والشركاء.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick return button for non-donor roles (e.g. Admin or Finance) */}
          {currentSessionProfile?.role !== 'donor' && (
            <button
              type="button"
              onClick={() => setActiveSection('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowRight size={14} />
              <span>الرجوع إلى الصفحة الرئيسية</span>
            </button>
          )}

          {/* New Donation Action */}
          <button
            type="button"
            onClick={() => setIsNewDonationModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>تقديم مساهمة جديدة</span>
          </button>
        </div>
      </div>

      {/* Account Simulation Selector Bar */}
      <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-950">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-teal-700 shrink-0" />
          <p className="text-slate-700">
            حساب المتبرع الحالي للمعاينة:
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeDonorId}
            onChange={(e) => setActiveDonorId(e.target.value)}
            className="p-1.5 border border-teal-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
          >
            {donorsList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inspirational Quranic Guidance Card for Donor */}
      <RoleInspirationalCard role="donor" />

      {/* Donor Contribution Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">إجمالي مساهماتك المسجلة</span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-bold text-slate-900" suppressHydrationWarning>
              {totalDonated.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-slate-500">ج.م</span>
          </div>
          <span className="text-[11px] text-teal-800 font-medium block mt-1">
            موزعة على {donorDonations.length} عمليات إيداع مسجلة
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">حالة الصرف والاعتماد</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-700">
              {currentAllocation?.status === 'approved' ? 'معتمد للصرف الفعلي' : 'مدرج بمقترح الشهر'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            دورة {currentAllocation?.periodLabel || 'أكتوبر 2026'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">الالتزام بالقيد والشرط</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-teal-900">
              100% مطابقة تامة
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            توجيه الأموال للغرض أو الحالة المحددة بالكامل
          </span>
        </div>
      </div>

      {/* Community Anonymous Contributions Honor Wall (نبض الخير والمساهمات المجتمعية) */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <HeartHandshake size={18} />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                نبض الخير والمساهمات المجتمعية (لوحة تحفيز بأسماء مستعارة)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              عرض مجهول ومحمي للمساهمات من أهل الخير للتشجيع على التكافل مع أيقونات رمزية مستوحاة من قيم العطاء.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            ﴿وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ﴾
          </span>
        </div>

        {/* Contribution Cards with Small Avatar Emblems (44px) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {anonymousCommunityDonations.map((item, index) => {
            const emblem = getEmblemForDonation(item.id, index);
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all duration-150 space-y-2.5"
              >
                {/* Header with Small Avatar Emblem (40-48px) and Contributor Info */}
                <div className="flex items-start gap-3">
                  {/* Symbolic Emblem Avatar Frame */}
                  <div
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border shadow-xs transition-transform hover:scale-105 ${emblem.containerBg} ${emblem.borderColor} ${emblem.ringColor}`}
                    title={`${emblem.title} · ${emblem.badgeText}`}
                  >
                    <CommunityEmblemRenderer type={emblem.type} />
                  </div>

                  {/* Identity & Location */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {item.alias}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                        {item.badge}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 truncate">{item.location}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-amber-800 font-medium text-[9px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                        {emblem.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500">قيمة المساهمة:</span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-base font-bold text-emerald-700" suppressHydrationWarning>
                      +{item.amount.toLocaleString('en-US')}
                    </span>
                    <span className="text-[10px] text-slate-500">ج.م</span>
                  </div>
                </div>

                {/* Contribution Purpose */}
                <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded-lg border border-slate-200/70">
                  {item.purpose}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Personal Donations Impact Cards */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">سجل مساهماتك وتفاصيل الأثر الميداني الخاص بك</h3>

        {donorDonations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            لا توجد تبرعات مسجلة لهذا الحساب حالياً
          </div>
        ) : (
          donorDonations.map((d) => (
            <div
              key={d.id}
              className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 font-mono" suppressHydrationWarning>
                      {d.amount.toLocaleString('en-US')} ج.م
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 font-mono">
                      كود: {d.donorReference}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>تاريخ الاستلام: {d.receivedDate}</span>
                    <span>·</span>
                    <span>
                      القناة:{' '}
                      {d.channel === 'bank_transfer'
                        ? 'تحويل بنكي'
                        : d.channel === 'instapay'
                        ? 'InstaPay'
                        : 'فودافون كاش'}
                    </span>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>محصل ومسجل بالسجلات المالية</span>
                </span>
              </div>

              {/* Impact / Allocation Transparency Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">شفافية توجيه التبرع:</span>

                {d.restrictionType === 'unrestricted' && (
                  <p className="text-slate-600 leading-relaxed">
                    تم إيداع مساهمتك في <strong>الصندوق العام</strong> لدعم المساعدات المالية الشهرية للأسر الأشد احتياجاً وفق درجات الأولوية المعتمدة لدورة {currentAllocation?.periodLabel}.
                  </p>
                )}

                {d.restrictionType === 'restricted_purpose' && (
                  <p className="text-slate-600 leading-relaxed">
                    تم توجيه التبرع حصرياً لغرض{' '}
                    <strong>
                      {d.designatedPurpose === 'medical'
                        ? 'الرعاية الطبية وأدوية الأمراض المزمنة وجلسات الغسيل الكلوي'
                        : d.designatedPurpose === 'orphan_sponsorship'
                        ? 'كفالة الأيتام وتأمين متطلبات تعليمهم ومعيشتهم'
                        : 'ترميم وتأهيل المنازل'}
                    </strong>
                    ، وتم ربط المبلغ مباشرة بالحالات المستحقة المطابقة في كشف الصرف.
                  </p>
                )}

                {d.restrictionType === 'restricted_case' && (
                  <p className="text-slate-600 leading-relaxed">
                    تم تخصيص التبرع بالكامل لصالح الحالة:{' '}
                    <strong className="text-teal-900">{d.designatedCaseName}</strong>، لتغطية نفقات الرعاية والعلاج المباشر دون استقطاع أي مصاريف إدارية.
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>التزام الخصوصية: لا يتم إظهار الأرقام القومية أو الهويات الشخصية للمستحقين علناً.</span>
                  <span className="font-semibold text-teal-800">مبادرة إحسان للتكافل</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
