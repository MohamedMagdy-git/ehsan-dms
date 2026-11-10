import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">الصفحة غير موجودة (404)</h2>
      <p className="text-sm text-slate-600 mb-4">عذراً، لم نتمكن من العثور على الصفحة المطلوبة.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#005756] text-white text-xs font-bold rounded-lg hover:bg-[#004241] transition-colors"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
