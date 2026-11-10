'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  HeartHandshake,
  DollarSign,
  Lock,
  Unlock,
  AlertCircle,
  Zap,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { DonationChannel, DonationRestriction, DonationPurpose } from '@/types';
import { AmountInput } from '@/components/common/amount-input';

interface NewDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewDonationModal({ isOpen, onClose }: NewDonationModalProps) {
  const { addDonation, cases, shariaCategories, setActiveSection, setFastTrackTriggerData } = useApp();

  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [amount, setAmount] = useState<number>(10000);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [channel, setChannel] = useState<DonationChannel>('bank_transfer');
  const [status, setStatus] = useState<'received' | 'pledged'>('received');
  const [restrictionType, setRestrictionType] = useState<DonationRestriction>('unrestricted');
  const [selectedShariaCategoryId, setSelectedShariaCategoryId] = useState<string>(
    shariaCategories[0]?.id || 'sharia-01'
  );
  const [designatedCaseId, setDesignatedCaseId] = useState(cases[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [promptFastTrack, setPromptFastTrack] = useState<{
    caseId: string;
    caseName: string;
    amount: number;
    donorName: string;
    manualReceiptNo?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setPromptFastTrack(null);
    setDonorName('');
    setDonorPhone('');
    setManualReceiptNo('');
    setNotes('');
    setErrorMessage('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!donorName.trim()) {
      setErrorMessage('يرجى إدخال اسم المتبرع أو فاعل خير');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMessage('يرجى إدخال مبلغ صحيح للتبرع');
      return;
    }

    const selectedCase = cases.find((c) => c.id === designatedCaseId);
    const selectedCat = shariaCategories.find((cat) => cat.id === selectedShariaCategoryId) || shariaCategories[0];

    // Auto-map to legacy designatedPurpose for backward compatibility
    let legacyPurpose: DonationPurpose | undefined = undefined;
    if (restrictionType === 'restricted_purpose') {
      if (selectedCat?.id === 'sharia-03') legacyPurpose = 'medical';
      else if (selectedCat?.id === 'sharia-02') legacyPurpose = 'orphan_sponsorship';
      else if (selectedCat?.id === 'sharia-07') legacyPurpose = 'housing_repair';
      else if (selectedCat?.id === 'sharia-06') legacyPurpose = 'food';
      else legacyPurpose = 'general_aid';
    }

    addDonation({
      donorId: `donor-${Date.now()}`,
      donorName: donorName.trim(),
      donorPhone: donorPhone.trim() || undefined,
      donorReference: '',
      manualReceiptNo: manualReceiptNo.trim() || undefined,
      amount: Number(amount),
      receivedDate,
      channel,
      status,
      restrictionType,
      designatedPurpose: legacyPurpose,
      shariaCategoryId: selectedCat?.id,
      shariaCategoryName: selectedCat?.name,
      designatedCaseId: restrictionType === 'restricted_case' ? designatedCaseId : undefined,
      designatedCaseName: restrictionType === 'restricted_case' && selectedCase ? (selectedCase.primaryName || selectedCase.fullName) : undefined,
      notes: notes.trim(),
    });

    if (restrictionType === 'restricted_case' && selectedCase) {
      setPromptFastTrack({
        caseId: selectedCase.id,
        caseName: selectedCase.primaryName || selectedCase.fullName,
        amount: Number(amount),
        donorName: donorName.trim(),
        manualReceiptNo: manualReceiptNo.trim() || undefined,
      });
    } else {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {promptFastTrack ? 'تأكيد قيد التبرع وإصدار إذن الصرف' : 'تسجيل تبرع ومساهمة جديدة'}
            </h3>
            <p className="text-xs text-slate-500">
              {promptFastTrack ? 'متابعة الدورة المستندية لتسليم المساعدة الميدانية' : 'إثبات المبالغ المستلمة بالسند الدفتري وتحديد قيود الصرف'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {promptFastTrack ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-7 h-7 fill-current" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>تم قيد وتوثيق التبرع في السجل المالي بنجاح</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">
                هل ترغب في إصدار إذن صرف فوري للحالة وتعيين الباحث لتسليمه الآن؟
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                التبرع مقيد بالاسم لصالح المستحق: <strong className="text-teal-950 font-bold">{promptFastTrack.caseName}</strong> بقيمة <strong className="text-emerald-800 font-mono font-bold">{promptFastTrack.amount.toLocaleString('ar-EG')} ج.م</strong> من المتبرع <span className="font-semibold">{promptFastTrack.donorName}</span>
                {promptFastTrack.manualReceiptNo ? ` بموجب السند الدفتري رقم (${promptFastTrack.manualReceiptNo})` : ''}.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs text-right space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-700 fill-current" />
                <span>المسار السريع للتسليم الميداني:</span>
              </div>
              <p className="text-amber-800 font-normal leading-relaxed">
                سيتم نقلك لشاشة الصرف الفوري فوراً مع تعبئة بيانات الحالة وتجهيز إذن الصرف المعتمد لطباعته وتكليف الباحث الميداني بالتسليم.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFastTrackTriggerData({
                    caseId: promptFastTrack.caseId,
                    suggestedAmount: promptFastTrack.amount,
                    donorName: promptFastTrack.donorName,
                    donationNote: `تبرع مقيد بالاسم من ${promptFastTrack.donorName}${promptFastTrack.manualReceiptNo ? ` (سند رقم: ${promptFastTrack.manualReceiptNo})` : ''}`,
                  });
                  setActiveSection('fast-track');
                  handleClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>نعم، الانتقال لإصدار إذن الصرف فوراً</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                لاحقاً من شاشة الصرف
              </button>
            </div>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-700 font-semibold">اسم المتبرع أو الجهة المانحة *</label>
                  <input
                    type="text"
                    required
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="مثال: د. إبراهيم فؤاد / فاعل خير"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                {/* Manual Receipt Number */}
                <div className="space-y-1 sm:col-span-2 bg-teal-50/50 p-3 rounded-xl border border-teal-200/70">
                  <div className="flex items-center justify-between">
                    <label className="text-teal-950 font-bold flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                      <span>رقم الإيصال الدفتري / سند القبض الورقي</span>
                    </label>
                    <span className="text-[10px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full font-bold">
                      موصى به للجرد والرقابة
                    </span>
                  </div>
                  <input
                    type="text"
                    value={manualReceiptNo}
                    onChange={(e) => setManualReceiptNo(e.target.value)}
                    placeholder="مثال: دفتر تضامن ج/22 - إيصال رقم 10459"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono bg-white text-slate-900 focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <p className="text-[10px] text-slate-500">
                    أدخل رقم إيصال الدفتر الورقي أو رقم سند القبض اليدوي لمطابقة التبرعات أثناء الجرد والتفتيش الرسمي.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">مبلغ التبرع (ج.م) *</label>
                  <AmountInput
                    min={100}
                    required
                    value={amount}
                    onChange={setAmount}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">تاريخ الاستلام أو الإيداع *</label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">قناة التحصيل أو وسيلة الدفع</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as DonationChannel)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="instapay">إنستاباي (InstaPay)</option>
                    <option value="vodafone_cash">فودافون كاش ومحافظ إلكترونية</option>
                    <option value="cheque">شيك بنكي</option>
                    <option value="cash_hand">نقدي يدوي بإيصال رسمي</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">حالة التحصيل</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'received' | 'pledged')}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="received">مستلم فعلياً ومتاح للصرف</option>
                    <option value="pledged">تعهد مؤكد لم يُحصل بعد</option>
                  </select>
                </div>
              </div>

              {/* Restriction type */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-slate-900 font-bold block">نوع القيد والالتزام الشرعي للتبرع:</label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRestrictionType('unrestricted')}
                className={`p-3 rounded-lg border text-right transition-colors ${
                  restrictionType === 'unrestricted'
                    ? 'border-teal-700 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block font-semibold">صندوق عام</span>
                <span className="text-[11px] text-slate-500 font-normal">مساعدات شهرية عامة</span>
              </button>

              <button
                type="button"
                onClick={() => setRestrictionType('restricted_purpose')}
                className={`p-3 rounded-lg border text-right transition-colors ${
                  restrictionType === 'restricted_purpose'
                    ? 'border-teal-700 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block font-semibold">مقيد بغرض</span>
                <span className="text-[11px] text-slate-500 font-normal">علاج أو أيتام أو سكن</span>
              </button>

              <button
                type="button"
                onClick={() => setRestrictionType('restricted_case')}
                className={`p-3 rounded-lg border text-right transition-colors ${
                  restrictionType === 'restricted_case'
                    ? 'border-teal-700 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block font-semibold">مقيد لحالة محددة</span>
                <span className="text-[11px] text-slate-500 font-normal">بالاسم وكود الملف</span>
              </button>
            </div>

            {/* Purpose / Sharia category select */}
            {restrictionType === 'restricted_purpose' && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mt-2">
                <label className="text-slate-800 font-bold block text-xs">اختر المصرف الشرعي أو الغرض المقيد:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-0.5">
                  {shariaCategories.filter(cat => cat.isActive).map((cat) => {
                    const isSelected = selectedShariaCategoryId === cat.id;
                    const badgeColors: Record<string, string> = {
                      emerald: 'border-emerald-300 bg-emerald-50 text-emerald-900',
                      purple: 'border-purple-300 bg-purple-50 text-purple-900',
                      rose: 'border-rose-300 bg-rose-50 text-rose-900',
                      teal: 'border-teal-300 bg-teal-50 text-teal-900',
                      amber: 'border-amber-300 bg-amber-50 text-amber-900',
                      cyan: 'border-cyan-300 bg-cyan-50 text-cyan-900',
                      indigo: 'border-indigo-300 bg-indigo-50 text-indigo-900',
                    };
                    const colorStyle = badgeColors[cat.color] || 'border-slate-200 bg-white text-slate-800';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedShariaCategoryId(cat.id)}
                        className={`p-2.5 rounded-lg border text-right transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? `${colorStyle} ring-2 ring-teal-700 shadow-xs font-bold`
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs">{cat.name}</span>
                          {isSelected && <span className="text-[10px] text-teal-700 font-bold">✓ محدد</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-normal">
                          {cat.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Designated case select */}
            {restrictionType === 'restricted_case' && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 mt-2">
                <label className="text-slate-700 font-semibold">الحالة المستفيدة المحددة بالاسم:</label>
                <select
                  value={designatedCaseId}
                  onChange={(e) => setDesignatedCaseId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.primaryName || c.fullName} {c.secondaryName ? `(${c.secondaryName})` : ''} ({c.code}) - فجوة: {c.financials.netFinancialGap.toLocaleString('ar-EG')} ج.م
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-slate-700 font-semibold">ملاحظات والتزامات المتبرع</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي اشتراطات خاصة بالصرف أو رقم إشعار التحويل..."
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              تسجيل التبرع في السجل المالي
            </button>
          </div>
        </form>
        </>
      )}
      </div>
    </div>
  );
}
