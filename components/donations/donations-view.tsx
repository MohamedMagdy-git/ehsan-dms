'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  HeartHandshake,
  Coins,
  Lock,
  Unlock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  User,
  ShieldCheck,
} from 'lucide-react';
import { DonationRestriction, DonationChannel } from '@/types';
import { InfoTooltip } from '@/components/common/info-tooltip';
import { MoneyDisplay } from '@/components/common/money-display';

interface DonationsViewProps {
  onOpenNewDonation: () => void;
}

export function DonationsView({ onOpenNewDonation }: DonationsViewProps) {
  const { donations, metrics, shariaCategories } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [restrictionFilter, setRestrictionFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [shariaFilter, setShariaFilter] = useState<string>('all');

  const filteredDonations = donations.filter((d) => {
    const matchesSearch =
      searchQuery === '' ||
      d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.donorReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.manualReceiptNo && d.manualReceiptNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.designatedCaseName && d.designatedCaseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.shariaCategoryName && d.shariaCategoryName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRestriction =
      restrictionFilter === 'all' || d.restrictionType === restrictionFilter;

    const matchesChannel = channelFilter === 'all' || d.channel === channelFilter;

    const matchesSharia =
      shariaFilter === 'all' ||
      d.shariaCategoryId === shariaFilter ||
      d.shariaCategoryName === shariaFilter;

    return matchesSearch && matchesRestriction && matchesChannel && matchesSharia;
  });

  const getChannelLabel = (channel: DonationChannel) => {
    switch (channel) {
      case 'bank_transfer': return 'تحويل بنكي';
      case 'instapay': return 'إنستاباي (InstaPay)';
      case 'vodafone_cash': return 'فودافون كاش ومحافظ إلكترونية';
      case 'cash_hand': return 'نقدي يدوي بالإيصال';
      case 'cheque': return 'شيك بنكي';
    }
  };

  const getRestrictionLabel = (restriction: DonationRestriction) => {
    switch (restriction) {
      case 'unrestricted': return 'عام غير مقيد (مساعدات شهرية عامة)';
      case 'restricted_purpose': return 'مقيد بغرض محدد (علاج/أيتام/سكن)';
      case 'restricted_case': return 'مقيد بالاسم لحالة معينة';
    }
  };

  const getShariaCategoryBadge = (shariaCategoryId?: string, shariaCategoryName?: string) => {
    if (!shariaCategoryId && !shariaCategoryName) {
      return <span className="text-slate-400 text-[11px]">-</span>;
    }
    const cat = shariaCategories.find((c) => c.id === shariaCategoryId);
    const name = cat?.name || shariaCategoryName || 'مصرف عام';
    const color = cat?.color || 'teal';

    const colorMap: Record<string, string> = {
      emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      purple: 'bg-purple-50 text-purple-800 border-purple-200',
      rose: 'bg-rose-50 text-rose-800 border-rose-200',
      teal: 'bg-teal-50 text-teal-800 border-teal-200',
      amber: 'bg-amber-50 text-amber-800 border-amber-200',
      cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${colorMap[color] || colorMap.teal}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        <span>{name}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">حركة التبرعات والمصارف</h2>
          <p className="text-xs text-slate-500">
            متابعة الصناديق والمحفظة وحصيلة أموال الصدقات والزكاة.
          </p>
        </div>

        <button
          onClick={onOpenNewDonation}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
        >
          <Plus size={16} />
          <span>تسجيل تبرع جديد</span>
        </button>
      </div>

      {/* Funds Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Unrestricted Fund */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-teal-800 font-bold">
              <Unlock size={14} className="text-[#76B837]" />
              <span>الصندوق العام (غير المقيد)</span>
              <InfoTooltip
                title="الصندوق العام المتاح"
                badge="غير مقيد"
                badgeColor="teal"
                icon="help"
                iconSize={13}
                content={
                  <p>
                    أموال تبرعات غير مقيدة بشرط من المتبرع، يحق لإدارة الجمعية توجيهها لسد فجوة أي أسرة مستحقة وفقاً لأولويات البحث الاجتماعي.
                  </p>
                }
              />
            </div>
            <div className="mt-1.5">
              <MoneyDisplay
                amount={metrics.unrestrictedDonationsBalance}
                size="xl"
                variant="neutral"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">متاح لتوزيع المساعدات الشهرية وفق الأولوية</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800 shrink-0">
            <Coins size={22} />
          </div>
        </div>

        {/* Restricted Funds */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-bold">
              <Lock size={14} className="text-indigo-600" />
              <span>أرصدة التبرعات المقيدة</span>
              <InfoTooltip
                title="التبرعات المشروطة بالأغراض والحالات"
                badge="مقيدة"
                badgeColor="indigo"
                icon="help"
                iconSize={13}
                content={
                  <p>
                    أموال التزم المتبرع بتخصيصها لمصارف محددة أو حالات بعينها. مفصولة محاسبياً وتغذي شاشة الصرف الفوري والأذونات الموجهة دون الخلط بالميزانية العامة.
                  </p>
                }
              />
            </div>
            <div className="mt-1.5">
              <MoneyDisplay
                amount={metrics.restrictedDonationsBalance}
                size="xl"
                variant="neutral"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 flex-wrap">
              <span className="text-indigo-700 font-medium">أغراض: {metrics.restrictedPurposeBalance.toLocaleString('ar-EG')} ج.م</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 font-medium">حالات محددة: {metrics.restrictedCaseBalance.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <HeartHandshake size={22} />
          </div>
        </div>

        {/* Pledged Funds */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
              <Clock size={14} className="text-amber-600" />
              <span>تعهدات تحت التحصيل</span>
              <InfoTooltip
                title="تعهدات تحت التحصيل"
                badge="قيد الانتظار"
                badgeColor="amber"
                icon="help"
                iconSize={13}
                content={
                  <p>
                    وعود وتعهدات بالتبرع أبلغ بها المتبرعون لكن لم تُودع نقدياً بالخزينة بعد، فلا تُحسب في السيولة المتاحة حتى تمام الإيداع الفعلي.
                  </p>
                }
              />
            </div>
            <div className="mt-1.5">
              <MoneyDisplay
                amount={metrics.pledgedDonationsTotal}
                size="xl"
                variant="gap"
              />
            </div>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">لا تُدرج بالميزانية حتى تمام الإيداع</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالمتبرع، الكود المرجعي، أو اسم الحالة المقيدة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600"
            />
          </div>

          <div>
            <select
              value={shariaFilter}
              onChange={(e) => setShariaFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="all">كل المصارف الشرعية</option>
              {shariaCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={restrictionFilter}
              onChange={(e) => setRestrictionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="all">كل قيود التبرعات</option>
              <option value="unrestricted">عام غير مقيد (الصندوق العام)</option>
              <option value="restricted_purpose">مقيد بغرض محدد (طبي/أيتام/سكن)</option>
              <option value="restricted_case">مقيد بالاسم لحالة معينة</option>
            </select>
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="all">كل قنوات الدفع والتحصيل</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="instapay">إنستاباي (InstaPay)</option>
              <option value="vodafone_cash">فودافون كاش</option>
              <option value="cheque">شيك بنكي</option>
              <option value="cash_hand">نقدي يدوي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Donations View: Responsive Cards on Mobile + Table on Desktop */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View: Responsive Card List (360px - 430px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredDonations.length === 0 ? (
            <div className="py-10 text-center text-slate-500 px-4">
              لا توجد تبرعات مسجلة تطابق البحث
            </div>
          ) : (
            filteredDonations.map((d) => (
              <div key={d.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors">
                {/* Header Row: Donor & Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{d.donorName}</div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-slate-500 mt-0.5">
                      <span>كود: {d.donorReference}</span>
                      {d.manualReceiptNo && (
                        <span className="text-teal-900 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/80 font-bold">
                          سند: {d.manualReceiptNo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <MoneyDisplay amount={d.amount} size="md" variant="neutral" />
                  </div>
                </div>

                {/* Sharia & Channel Row */}
                <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    {getShariaCategoryBadge(d.shariaCategoryId, d.shariaCategoryName)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {d.receivedDate} · {getChannelLabel(d.channel)}
                  </div>
                </div>

                {/* Restriction & Status Row */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    {d.restrictionType === 'unrestricted' && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                        الصندوق العام
                      </span>
                    )}
                    {d.restrictionType === 'restricted_purpose' && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 truncate max-w-[200px]">
                        مقيد لغرض: {d.designatedPurpose === 'medical' ? 'علاج طبي' : d.designatedPurpose === 'orphan_sponsorship' ? 'كفالة أيتام' : d.designatedPurpose === 'housing_repair' ? 'ترميم' : 'غذائي'}
                      </span>
                    )}
                    {d.restrictionType === 'restricted_case' && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[200px]">
                        لحالة: {d.designatedCaseName}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    {d.status === 'received' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 size={11} />
                        <span>محصل</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Clock size={11} />
                        <span>تعهد</span>
                      </span>
                    )}
                  </div>
                </div>

                {d.notes && (
                  <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg leading-relaxed">
                    {d.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Data Table (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">كود التبرع والمتبرع</th>
                <th className="py-3 px-3">المبلغ المحصل</th>
                <th className="py-3 px-3">المصرف الشرعي</th>
                <th className="py-3 px-3">تاريخ الاستلام</th>
                <th className="py-3 px-3">قناة التحصيل</th>
                <th className="py-3 px-3">طبيعة القيد والتخصيص</th>
                <th className="py-3 px-3">الحالة المالية</th>
                <th className="py-3 px-4">ملاحظات والتزام الصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    لا توجد تبرعات مسجلة تطابق البحث
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Code & Donor */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{d.donorName}</div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono mt-0.5">
                        <span className="text-slate-400">كود: {d.donorReference}</span>
                        {d.manualReceiptNo && (
                          <span className="text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80 font-bold">
                            سند دفتري: {d.manualReceiptNo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3">
                      <MoneyDisplay amount={d.amount} size="md" variant="neutral" />
                    </td>

                    {/* Sharia Category */}
                    <td className="py-3 px-3">
                      {getShariaCategoryBadge(d.shariaCategoryId, d.shariaCategoryName)}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {d.receivedDate}
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-3 text-slate-700">
                      {getChannelLabel(d.channel)}
                    </td>

                    {/* Restriction */}
                    <td className="py-3 px-3">
                      {d.restrictionType === 'unrestricted' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                          الصندوق العام المفتوح
                        </span>
                      )}
                      {d.restrictionType === 'restricted_purpose' && (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            مقيد لغرض: {d.designatedPurpose === 'medical' ? 'علاج طبي وأدوية' : d.designatedPurpose === 'orphan_sponsorship' ? 'كفالة أيتام' : d.designatedPurpose === 'housing_repair' ? 'ترميم منازل' : 'مواد غذائية'}
                          </span>
                        </div>
                      )}
                      {d.restrictionType === 'restricted_case' && (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            مقيد بالاسم: {d.designatedCaseName}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {d.status === 'received' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 size={12} />
                          <span>محصل ومتاح</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock size={12} />
                          <span>تعهد مؤكد</span>
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-600 text-[11px] max-w-[220px]">
                      {d.notes || 'لا توجد ملاحظات إضافية'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
