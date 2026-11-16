'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { DonationChannel } from '@/types';
import { MoneyDisplay } from '@/components/common/money-display';

interface DonationsViewProps {
  onOpenNewDonation: () => void;
}

export function DonationsView({ onOpenNewDonation }: DonationsViewProps) {
  const { donations, metrics } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const receivedCount = donations.filter((d) => d.status === 'received').length;
  const pledgedCount = donations.filter((d) => d.status === 'pledged').length;

  const hasActiveFilters =
    searchQuery.trim() !== '' || channelFilter !== 'all' || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setChannelFilter('all');
    setStatusFilter('all');
  };

  const filteredDonations = donations.filter((d) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      d.donorName.toLowerCase().includes(query) ||
      d.donorReference.toLowerCase().includes(query) ||
      (d.manualReceiptNo && d.manualReceiptNo.toLowerCase().includes(query)) ||
      (d.notes && d.notes.toLowerCase().includes(query));

    const matchesChannel = channelFilter === 'all' || d.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  const getChannelLabel = (channel: DonationChannel) => {
    switch (channel) {
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'instapay':
        return 'إنستاباي (InstaPay)';
      case 'vodafone_cash':
        return 'فودافون كاش أو محفظة إلكترونية';
      case 'cash_hand':
        return 'نقدي بإيصال';
      case 'cheque':
        return 'شيك بنكي';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Bar & Primary Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">ملخص الخزينة</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>بالجنيه المصري (ج.م)</span>
        </div>

        <button
          type="button"
          onClick={onOpenNewDonation}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus size={16} />
          <span>تسجيل تبرع جديد</span>
        </button>
      </div>

      {/* Top KPI Cards (3 Unified Calm White Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Received in Treasury */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">
              المستلم بالخزينة
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              تبرعات دخلت الخزينة فعلياً
            </span>
          </div>
          <div className="mt-3">
            <MoneyDisplay
              amount={metrics.receivedDonationsTotal}
              size="xl"
              variant="neutral"
            />
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>حالة السيولة</span>
              <span className="text-slate-700 font-semibold">خزينة موحدة</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pledged Pending Collection */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">
              تعهدات قيد التحصيل
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              مبالغ منتظرة لم تُودع بعد
            </span>
          </div>
          <div className="mt-3">
            <MoneyDisplay
              amount={metrics.pledgedDonationsTotal}
              size="xl"
              variant="neutral"
            />
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>الإدراج بالصرف</span>
              <span className="text-slate-600 font-medium">بعد الإيداع الفعلي</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Recorded Transactions */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">
              عدد حركات التبرع
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              إجمالي السجلات المسجلة
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {donations.length}
              </span>
              <span className="text-xs text-slate-500 font-normal">حركة</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
              <span>تفصيل السجلات</span>
              <span className="text-slate-700 font-semibold">
                {receivedCount} مستلمة · {pledgedCount} قيد التحصيل
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streamlined Filter Toolbar (3 Filters) */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="ابحث باسم المتبرع، الكود، أو رقم الإيصال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors"
            />
          </div>

          {/* Payment Channel Filter */}
          <div className="relative">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              aria-label="تصفية حسب طريقة الدفع"
              className="w-full h-10 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 pr-3 pl-8 appearance-none transition-colors cursor-pointer"
            >
              <option value="all">كل طرق الدفع</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="instapay">إنستاباي (InstaPay)</option>
              <option value="vodafone_cash">فودافون كاش أو محفظة إلكترونية</option>
              <option value="cheque">شيك بنكي</option>
              <option value="cash_hand">نقدي بإيصال</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Donation Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="تصفية حسب حالة المبلغ"
              className="w-full h-10 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200/80 rounded-xl focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 pr-3 pl-8 appearance-none transition-colors cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="received">مستلم بالخزينة</option>
              <option value="pledged">تعهد قيد التحصيل</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="tabular-nums">
              عرض {filteredDonations.length} من أصل {donations.length} حركة
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[#005756] font-semibold hover:underline cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>مسح الفلاتر</span>
            </button>
          </div>
        )}
      </div>

      {/* Donations Ledger: Responsive Mobile Cards + 6-Column Desktop Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-none overflow-hidden">
        {/* Mobile View: Clean White Card List */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredDonations.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2.5">
              <p className="text-xs text-slate-500">
                {donations.length === 0
                  ? 'لا توجد تبرعات مسجلة حتى الآن'
                  : 'لا توجد تبرعات تطابق اختيارات البحث'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-[#005756] hover:underline cursor-pointer"
                >
                  عرض كل التبرعات
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenNewDonation}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#005756] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Plus size={14} />
                  <span>تسجيل أول تبرع</span>
                </button>
              )}
            </div>
          ) : (
            filteredDonations.map((d) => (
              <div
                key={d.id}
                className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors"
              >
                {/* Row 1: Donor + Receipt Metadata & Amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {d.donorName}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                      <span>{d.donorReference}</span>
                      {d.manualReceiptNo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>إيصال {d.manualReceiptNo}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <MoneyDisplay amount={d.amount} size="md" variant="neutral" />
                  </div>
                </div>

                {/* Row 2: Payment Method, Date & Status */}
                <div className="flex items-center justify-between gap-2 text-[11px] pt-2 border-t border-slate-100">
                  <div className="text-slate-600 flex items-center gap-1.5 min-w-0 truncate">
                    <span className="truncate">{getChannelLabel(d.channel)}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 shrink-0">
                      {d.receivedDate}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {d.status === 'received' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#005756]">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>مستلم بالخزينة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>قيد التحصيل</span>
                      </span>
                    )}
                  </div>
                </div>

                {d.notes && (
                  <p className="text-xs text-slate-600 text-right pt-1 leading-relaxed">
                    {d.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View: 6-Column Clean Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold">
                <th className="py-3 px-4">المتبرع وبيانات السند</th>
                <th className="py-3 px-3">المبلغ (ج.م)</th>
                <th className="py-3 px-3">طريقة الدفع</th>
                <th className="py-3 px-3">تاريخ الاستلام</th>
                <th className="py-3 px-3">حالة المبلغ</th>
                <th className="py-3 px-4 text-right">ملاحظات أو شرط المتبرع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-500">
                        {donations.length === 0
                          ? 'لا توجد تبرعات مسجلة حتى الآن'
                          : 'لا توجد تبرعات تطابق اختيارات البحث'}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-xs font-semibold text-[#005756] hover:underline cursor-pointer"
                        >
                          مسح الفلاتر وعرض كل التبرعات
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenNewDonation}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>تسجيل أول تبرع</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Donor & Receipt Metadata */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{d.donorName}</div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                        <span>{d.donorReference}</span>
                        {d.manualReceiptNo && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span>إيصال {d.manualReceiptNo}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-3">
                      <MoneyDisplay amount={d.amount} size="sm" variant="neutral" />
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-3 text-slate-700">
                      {getChannelLabel(d.channel)}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 font-mono tabular-nums text-slate-600">
                      {d.receivedDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      {d.status === 'received' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#005756]">
                          <CheckCircle2 size={14} className="shrink-0" />
                          <span>مستلم بالخزينة</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                          <Clock size={14} className="text-slate-400 shrink-0" />
                          <span>تعهد قيد التحصيل</span>
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 text-right text-xs text-slate-600 max-w-[260px] leading-relaxed">
                      {d.notes ? d.notes : <span className="text-slate-400">—</span>}
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
