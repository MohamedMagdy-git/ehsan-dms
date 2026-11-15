'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { X, AlertCircle } from 'lucide-react';
import { DonationChannel } from '@/types';
import { AmountInput } from '@/components/common/amount-input';

interface NewDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewDonationModal({ isOpen, onClose }: NewDonationModalProps) {
  const { addDonation } = useApp();

  const [donorName, setDonorName] = useState('');
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [amount, setAmount] = useState<number>(10000);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [channel, setChannel] = useState<DonationChannel>('bank_transfer');
  const [status, setStatus] = useState<'received' | 'pledged'>('received');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setDonorName('');
    setManualReceiptNo('');
    setNotes('');
    setErrorMessage('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!donorName.trim()) {
      setErrorMessage('يرجى إدخال اسم المتبرع أو الجهة');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMessage('يرجى إدخال مبلغ صحيح للتبرع');
      return;
    }

    addDonation({
      donorId: `donor-${Date.now()}`,
      donorName: donorName.trim(),
      donorReference: '',
      manualReceiptNo: manualReceiptNo.trim() || undefined,
      amount: Number(amount),
      receivedDate,
      channel,
      status,
      restrictionType: 'unrestricted',
      notes: notes.trim(),
    });

    handleClose();
  };

  const inputClass =
    'w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">تسجيل تبرع جديد</h2>
            <p className="text-xs text-slate-500 mt-1">
              تسجيل مبالغ التبرعات المستلمة لدعم أسر المنظومة
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-50/70 border-b border-rose-200/80 text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-700 font-semibold block">
                اسم المتبرع أو الجهة <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="مثال: د. إبراهيم فؤاد / فاعل خير"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold block">
                مبلغ التبرع (ج.م) <span className="text-rose-600">*</span>
              </label>
              <AmountInput
                min={100}
                required
                value={amount}
                onChange={setAmount}
                className="rounded-xl border-slate-200/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold block">
                تاريخ الاستلام <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold block">طريقة الدفع</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as DonationChannel)}
                className={inputClass}
              >
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="instapay">إنستاباي (InstaPay)</option>
                <option value="vodafone_cash">فودافون كاش أو محفظة إلكترونية</option>
                <option value="cheque">شيك بنكي</option>
                <option value="cash_hand">نقدي بإيصال</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-semibold block">حالة المبلغ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'received' | 'pledged')}
                className={inputClass}
              >
                <option value="received">مستلم بالخزينة</option>
                <option value="pledged">تعهد قيد التحصيل</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-700 font-semibold block">
                رقم الإيصال الدفتري (اختياري)
              </label>
              <input
                type="text"
                value={manualReceiptNo}
                onChange={(e) => setManualReceiptNo(e.target.value)}
                placeholder="مثال: دفتر تضامن ج/22 - إيصال رقم 10459"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-700 font-semibold block">
                ملاحظات أو شرط المتبرع (اختياري)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظة أو رغبة للمتبرع أو رقم إشعار التحويل..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#005756] hover:bg-[#004746] text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              حفظ التبرع
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
