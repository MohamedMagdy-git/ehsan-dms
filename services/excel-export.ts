import * as XLSX from 'xlsx';
import { MonthlyAllocation, BeneficiaryCase, AllocationItem, FastTrackDisbursementOrder, Donation } from '@/types';
import { getPriorityLabel } from './scoring-engine';
import { tafqeetNumberToArabicWords } from '@/lib/tafqeet';

/**
 * دالة مساعدة لتنسيق اسم المستفيد شاملاً الأساسي والثانوي
 */
function formatBeneficiaryDisplayName(caseObj?: BeneficiaryCase, fallbackName?: string): string {
  if (!caseObj) return fallbackName || 'غير محدد';
  const primary = caseObj.primaryName || caseObj.fullName;
  if (caseObj.secondaryName && caseObj.secondaryName.trim()) {
    return `${primary} (${caseObj.secondaryName.trim()})`;
  }
  return primary;
}

/**
 * دالة مساعدة لتنسيق العنوان ورقم الهاتف للتواصل الميداني
 */
function formatContactInfo(caseObj?: BeneficiaryCase): string {
  if (!caseObj) return 'غير متوفر';
  const parts: string[] = [];
  if (caseObj.governorate) parts.push(caseObj.governorate);
  if (caseObj.district) parts.push(caseObj.district);
  if (caseObj.address) parts.push(caseObj.address);
  const addressStr = parts.join(' - ');
  const phoneStr = caseObj.phone ? `ت: ${caseObj.phone}` : 'لا يوجد هاتف';
  return addressStr ? `${addressStr} | ${phoneStr}` : phoneStr;
}

/**
 * دالة مساعدة لتحديد القيمة الذكية لخانة توقيع أو بصمة المستلم
 * - إذا كانت الحالة مستبعدة: كتابة «مستبعد من الصرف»
 * - إذا كانت الحالة تم صرفها وتسليمها ميدانياً ولديها إيصال استلام: كتابة «تم الاستلام (إيصال معتمد)»
 * - إذا كانت الحالة معتمدة وقيد الصرف الميداني: ترك الخلية فارغة تماماً لإتاحة التوقيع والبصمة الحية عند طباعة الكشف ورقياً
 */
function getRecipientSignatureValue(
  item: AllocationItem,
  allocation: MonthlyAllocation,
  caseObj?: BeneficiaryCase
): string {
  if (item.isExcluded) {
    return 'مستبعد من الصرف';
  }

  const isDeliveredWithReceipt =
    (item as any).isDisbursed === true ||
    Boolean((item as any).receiptNumber) ||
    (item as any).delivered === true ||
    (allocation.status === 'closed' && item.approvedAmount > 0) ||
    Boolean(caseObj && (caseObj as any).hasDeliveryReceipt);

  if (isDeliveredWithReceipt) {
    return 'تم الاستلام (إيصال معتمد)';
  }

  return '';
}

/**
 * تصدير كشف الصرف الميداني المخصص لباحث معين
 * يتضمن ترويسة رسمية بالأعلى، والأعمدة الثمانية المعتمدة، وخانات التوقيع والملاحظات
 */
export function exportResearcherAllocationToExcel(
  allocation: MonthlyAllocation,
  cases: BeneficiaryCase[],
  researcherName: string,
  customFileName?: string
): void {
  try {
    const caseMap = new Map<string, BeneficiaryCase>();
    cases.forEach((c) => caseMap.set(c.id, c));

    // تصفية الحالات المسندة لهذا الباحث فقط
    const researcherItems = allocation.items.filter((item) => {
      const caseObj = caseMap.get(item.caseId);
      return caseObj && caseObj.assignedResearcher === researcherName;
    });

    const activeFundedItems = researcherItems.filter((i) => !i.isExcluded);
    const totalCustodyAmount = activeFundedItems.reduce((sum, i) => sum + i.approvedAmount, 0);

    const todayStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const sessionMinutesNum = allocation.sessionMinutesNumber || 'مطابق لمحضر الجلسة';
    const sessionMinutesDate = allocation.sessionMinutesDate || allocation.approvedDate || 'غير محدد';

    const batchName = allocation.batchTitle || allocation.periodLabel;
    const execDate = allocation.executionDate || todayStr;

    // 1. بناء صفوف الترويسة المباشرة والمحددة
    const aoa: (string | number)[][] = [
      ['مؤسسة إحسان للتكافل والتنمية الاجتماعية - كشف صرف المساعدات النقدية الميدانية (عهدة باحث)', '', '', '', ''],
      [`اسم الدفعة المعتمد: ${batchName}`, '', `اسم الباحث: ${researcherName}`, '', `التاريخ: ${execDate}`],
      [`حالة الدورة: ${allocation.status === 'approved' ? 'معتمد رسمياً' : 'مسودة قيد الصرف'}`, '', `إجمالي الحالات: ${researcherItems.length} حالة`, '', `إجمالي مبلغ العهدة: ${totalCustodyAmount.toLocaleString('ar-EG')} ج.م`],
      [], // سطر فارغ فاصل
      [
        'م',
        'اسم الحالة',
        'الرقم القومي',
        'المبلغ المقرر صرفه (ج.م)',
        'توقيع / بصمة المستفيد',
      ],
    ];

    // 2. إدراج بيانات الحالات في الأعمدة الخمسة المحددة بدقة
    researcherItems.forEach((item, index) => {
      const caseObj = caseMap.get(item.caseId);
      const displayName = formatBeneficiaryDisplayName(caseObj, item.caseName);
      const nationalId = caseObj?.nationalId || 'مرفق بالملف';
      const amount = item.isExcluded ? 0 : item.approvedAmount;
      const signatureValue = getRecipientSignatureValue(item, allocation, caseObj);

      aoa.push([
        index + 1,
        displayName,
        nationalId,
        amount,
        signatureValue,
      ]);
    });

    // 3. صفوف الإجماليات والتوقيعات والاعتمادات الإدارية بأسفل الكشف (تذييل رسمي ثلاثي)
    aoa.push([]); // سطر فاصل
    aoa.push([
      '',
      'الإجمالي العام لعهدة الصرف:',
      `فقط وقدره: ${totalCustodyAmount.toLocaleString('ar-EG')} ج.م`,
      totalCustodyAmount,
      '',
    ]);
    aoa.push([]); // سطر فاصل

    // صف الاعتمادات الرسمية الثلاثية المعتمدة (الباحث، أمين الصندوق، رئيس مجلس الإدارة)
    aoa.push([
      'توقيع الباحث الميداني المستلم:',
      '....................................',
      'مراجعة أمين الصندوق:',
      'اعتماد رئيس مجلس الإدارة:',
      '....................................',
    ]);
    aoa.push([
      'الاسم:',
      researcherName,
      'أ. محمود صبري',
      allocation.approvedBy || 'أ. أحمد الجزار',
      '(الختم الرسمي)',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // ضبط مصفوفة العروض للأعمدة الخمسة المعتمدة
    worksheet['!cols'] = [
      { wch: 8 },  // م
      { wch: 32 }, // اسم الحالة
      { wch: 22 }, // الرقم القومي
      { wch: 22 }, // المبلغ المقرر صرفه
      { wch: 28 }, // توقيع / بصمة المستفيد
    ];

    // تفعيل خاصية التفاف النص والمحاذاة الرأسية على كافة خلايا الجدول
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:E1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell) {
          if (!cell.s) cell.s = {};
          cell.s.alignment = {
            wrapText: true,
            vertical: 'center',
            horizontal: C === 0 || C === 3 || C === 4 ? 'center' : 'right',
          };
        }
      }
    }

    // تفعيل خيارات ملاءمة الطباعة (Landscape & Fit to 1 Page Wide)
    worksheet['!pageSetup'] = {
      orientation: 'landscape', // توجيه أفقي ليتسع لكافة الأعمدة الخمسة
      paperSize: 9,             // A4
      fitToWidth: 1,            // ملاءمة كافة الأعمدة في عرض صفحة واحدة إجبارياً
      fitToHeight: 0,           // ترك الطول مرناً في حال زادت الحالات عن صفحة
      scale: 100,
    };

    // تفعيل خاصية الملاءمة والاتجاه العربي من اليمين لليسار في إعدادات الورقة
    if (!worksheet['!sheetViews']) worksheet['!sheetViews'] = [{}];
    worksheet['!sheetViews'][0] = { rightToLeft: true };
    worksheet['!views'] = [{ rightToLeft: true }];

    // تفعيل خيار fitToPage في خصائص الورقة
    worksheet['!properties'] = {
      fitToPage: true,
      tabColor: { rgb: '10B981' },
    };

    // ضبط الهوامش لتكون ضيقة لزيادة مساحة الطباعة
    worksheet['!margins'] = {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.1,
      footer: 0.1,
    };

    // 4. ورقة ثانية لتعليمات وضوابط تسليم العهدة
    const instructionsAoa: (string | number)[][] = [
      ['تعليمات وضوابط تسليم المساعدات النقدية الميدانية للباحث'],
      ['1. التأكد من هوية المستلم بالاطلاع على أصل بطاقة الرقم القومي قبل التسليم.'],
      ['2. الحصول على توقيع أو بصمة المستلم الحية في خانة التوقيع المخصصة.'],
      ['3. في حال تعذر الوصول للمستفيد أو وفاته أو تغيير سكنه، يُرد المبلغ للخزينة ويدون ذلك في الملاحظات.'],
      ['4. يُحظر تماماً استقطاع أي جزء من المبلغ تحت أي مسمى.'],
      ['5. يتم تسوية هذه العهدة مع الإدارة المالية فور انتهاء الزيارات الميدانية مصحوبة بهذا الكشف موقعاً ومختوماً.'],
      [],
      ['بيانات استلام العهدة:'],
      [`اسم الباحث المستلم: ${researcherName}`],
      [`المبلغ المستلم نقداً: ${totalCustodyAmount.toLocaleString('ar-EG')} ج.م`],
      [`تاريخ الاستلام من الخزينة: ____________________`],
      [`توقيع الباحث بالاستلام: ____________________`],
    ];

    const instructionsWorksheet = XLSX.utils.aoa_to_sheet(instructionsAoa);
    instructionsWorksheet['!cols'] = [{ wch: 80 }];
    instructionsWorksheet['!pageSetup'] = {
      orientation: 'portrait',
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 1,
    };
    instructionsWorksheet['!margins'] = {
      left: 0.4,
      right: 0.4,
      top: 0.4,
      bottom: 0.4,
      header: 0.1,
      footer: 0.1,
    };
    if (!instructionsWorksheet['!sheetViews']) instructionsWorksheet['!sheetViews'] = [{}];
    instructionsWorksheet['!sheetViews'][0] = { rightToLeft: true };
    instructionsWorksheet['!views'] = [{ rightToLeft: true }];

    // تجميع المصنف
    const workbook = XLSX.utils.book_new();
    const sheetTitle = `كشف_عهدة_${researcherName.replace(/[\s\.\/]+/g, '_')}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'ضوابط تسوية العهدة');

    const sanitizedResearcher = researcherName.replace(/[\s\.\/]+/g, '_');
    const fileName =
      customFileName ||
      `كشف_صرف_ميداني_${sanitizedResearcher}_${allocation.period}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Failed to export researcher Excel sheet:', error);
    throw error;
  }
}

/**
 * تصدير كشف الصرف الميداني السريع للباحث (4 أعمدة فقط)
 * 1. م (المسلسل)
 * 2. اسم الحالة وشهرتها
 * 3. المبلغ المقرر صرفه
 * 4. ملاحظات الإدارة والتسليم الميداني
 */
export function exportQuickFieldDeliveryToExcel(
  allocation: MonthlyAllocation,
  cases: BeneficiaryCase[],
  researcherName: string,
  fieldNotes: Record<string, string> = {},
  customFileName?: string
): void {
  try {
    const caseMap = new Map<string, BeneficiaryCase>();
    cases.forEach((c) => caseMap.set(c.id, c));

    let items = allocation.items.filter((item) => !item.isExcluded && item.approvedAmount > 0);
    if (researcherName !== 'all') {
      items = items.filter((item) => {
        const caseObj = caseMap.get(item.caseId);
        return caseObj && caseObj.assignedResearcher === researcherName;
      });
    }

    const totalCustodyAmount = items.reduce((sum, i) => sum + i.approvedAmount, 0);
    const batchName = allocation.batchTitle || allocation.periodLabel;
    const execDate =
      allocation.executionDate ||
      new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    const scopeLabel = researcherName === 'all' ? 'كافة المناطق' : researcherName;
    const aoa: (string | number)[][] = [
      [`${batchName} - ${scopeLabel} - إجمالي: ${totalCustodyAmount.toLocaleString('ar-EG')} ج.م`, '', '', ''],
      [`الباحث المسؤول: ${researcherName === 'all' ? 'كافة الباحثين' : researcherName}`, '', `تاريخ التوزيع: ${execDate}`, `عدد الحالات: ${items.length}`],
      [], // سطر فارغ
      [
        'م',
        'اسم الحالة وشهرتها',
        'المبلغ المقرر صرفه (ج.م)',
        'الملاحظات الميدانية والتوجيه',
      ],
    ];

    items.forEach((item, index) => {
      const caseObj = caseMap.get(item.caseId);
      const displayName = formatBeneficiaryDisplayName(caseObj, item.caseName);
      const noteText =
        fieldNotes[item.id] !== undefined
          ? fieldNotes[item.id]
          : (item.reasoning || '');

      aoa.push([
        index + 1,
        displayName,
        item.approvedAmount,
        noteText,
      ]);
    });

    aoa.push([]); // سطر فاصل
    aoa.push([
      '',
      'الإجمالي العام:',
      totalCustodyAmount,
      `فقط وقدره: ${tafqeetNumberToArabicWords(totalCustodyAmount)}`,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [
      { wch: 8 },  // م
      { wch: 36 }, // اسم الحالة وشهرتها
      { wch: 24 }, // المبلغ المقرر صرفه
      { wch: 48 }, // ملاحظات الإدارة والتسليم الميداني
    ];

    if (!worksheet['!sheetViews']) worksheet['!sheetViews'] = [{}];
    worksheet['!sheetViews'][0] = { rightToLeft: true };
    worksheet['!views'] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    const sheetTitle = `كشف_ميداني_${researcherName.replace(/[\s\.\/]+/g, '_')}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

    const sanitizedResearcher = researcherName.replace(/[\s\.\/]+/g, '_');
    const fileName =
      customFileName ||
      `كشف_صرف_ميداني_سريع_${sanitizedResearcher}_${allocation.period}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Failed to export quick field delivery Excel sheet:', error);
    throw error;
  }
}

/**
 * تصدير تقرير تخصيص المساعدات الشهرية العام إلى ملف Excel (.xlsx)
 * يدعم التصفية حسب باحث محدد إذا طُلب، ويدعم إظهار الأسماء المزدوجة والعناوين
 */
export function exportMonthlyAllocationToExcel(
  allocation: MonthlyAllocation,
  cases?: BeneficiaryCase[],
  options?: {
    researcherFilter?: string;
    customFileName?: string;
  }
): void {
  try {
    // إذا كان هناك باحث محدد تم اختياره للتصدير
    if (options?.researcherFilter && options.researcherFilter !== 'all' && cases && cases.length > 0) {
      exportResearcherAllocationToExcel(
        allocation,
        cases,
        options.researcherFilter,
        options.customFileName
      );
      return;
    }

    const caseMap = new Map<string, BeneficiaryCase>();
    if (cases) {
      cases.forEach((c) => caseMap.set(c.id, c));
    }

    // 1. ورقة بيانات كشف صرف المساعدات المعتمدة الشاملة
    const itemsData = allocation.items.map((item, index) => {
      const caseObj = caseMap.get(item.caseId);
      const displayName = formatBeneficiaryDisplayName(caseObj, item.caseName);
      const contactInfo = formatContactInfo(caseObj);
      const researcher = caseObj?.assignedResearcher || 'غير محدد';

      return {
        'م': index + 1,
        'كود الحالة': item.caseCode,
        'اسم المستفيد (الأساسي والثانوي)': displayName,
        'الباحث المسؤول': researcher,
        'العنوان ورقم الهاتف': contactInfo,
        'الفئة': getPriorityLabel(item.priority),
        'الفجوة المالية': item.financialGap,
        'المبلغ المعتمد للصرف': item.isExcluded ? 0 : item.approvedAmount,
        'مصدر التمويل': item.fundSourceName,
        'توقيع الاستلام': getRecipientSignatureValue(item, allocation, caseObj),
        'حالة الصرف': item.isExcluded ? `مستبعد (${item.exclusionReason || 'بقرار إداري'})` : 'معتمد للصرف',
        'تعديل يدوي': item.isManuallyAdjusted ? 'نعم (معدل)' : 'مقترح النظام',
        'ملاحظات ومبررات التخصيص': item.reasoning,
      };
    });

    const itemsWorksheet = XLSX.utils.json_to_sheet(itemsData);

    itemsWorksheet['!cols'] = [
      { wch: 6 },  // م
      { wch: 14 }, // كود الحالة
      { wch: 34 }, // اسم المستفيد (الأساسي والثانوي)
      { wch: 22 }, // الباحث المسؤول
      { wch: 44 }, // العنوان ورقم الهاتف
      { wch: 16 }, // الفئة
      { wch: 18 }, // الفجوة المالية
      { wch: 24 }, // المبلغ المعتمد للصرف
      { wch: 28 }, // مصدر التمويل
      { wch: 28 }, // توقيع الاستلام
      { wch: 22 }, // حالة الصرف
      { wch: 15 }, // تعديل يدوي
      { wch: 45 }, // ملاحظات ومبررات التخصيص
    ];

    itemsWorksheet['!views'] = [{ rightToLeft: true }];

    // تفعيل خيارات ملاءمة الطباعة (Landscape & Fit to 1 Page Wide)
    itemsWorksheet['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
      scale: 100,
    };

    if (!itemsWorksheet['!sheetViews']) itemsWorksheet['!sheetViews'] = [{}];
    itemsWorksheet['!sheetViews'][0] = { rightToLeft: true };

    itemsWorksheet['!properties'] = {
      fitToPage: true,
      tabColor: { rgb: '005756' },
    };

    itemsWorksheet['!margins'] = {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.1,
      footer: 0.1,
    };

    // 2. ورقة ملخص الميزانية والرقابة المالية
    const summaryData = [
      { 'بيان الميزانية': 'دورة الصرف والتقرير', 'القيمة الرقمية': allocation.periodLabel },
      { 'بيان الميزانية': 'رقم محضر جلسة الاعتماد', 'القيمة الرقمية': allocation.sessionMinutesNumber || 'مطابق لمحضر الجلسة' },
      { 'بيان الميزانية': 'تاريخ انعقاد جلسة الاعتماد', 'القيمة الرقمية': allocation.sessionMinutesDate || allocation.approvedDate || 'غير محدد' },
      { 'بيان الميزانية': 'حالة المقترح', 'القيمة الرقمية': allocation.status === 'approved' ? 'معتمد رسمياً' : allocation.isExceptionallyUnlocked ? 'مسودة (مفتوحة استثنائياً)' : 'مسودة مقترحة' },
      ...(allocation.isExceptionallyUnlocked ? [
        { 'بيان الميزانية': 'فتح استثنائي بواسطة', 'القيمة الرقمية': allocation.unlockedBy || '' },
        { 'بيان الميزانية': 'تاريخ الفتح الاستثنائي', 'القيمة الرقمية': allocation.unlockedDate || '' },
        { 'بيان الميزانية': 'سبب التعديل الاستثنائي', 'القيمة الرقمية': allocation.unlockReason || '' },
      ] : []),
      { 'بيان الميزانية': 'إجمالي الميزانية المتاحة للشهر (ج.م)', 'القيمة الرقمية': allocation.totalBudget },
      { 'بيان الميزانية': 'إجمالي المساعدات المعتمدة للصرف (ج.م)', 'القيمة الرقمية': allocation.summary.totalAllocated },
      { 'بيان الميزانية': 'الفائض المتبقي غير المخصص (ج.م)', 'القيمة الرقمية': allocation.summary.unallocatedBalance },
      { 'بيان الميزانية': 'إجمالي الاحتياج المالي الفعلي للحالات (ج.م)', 'القيمة الرقمية': allocation.summary.totalAssessedNeed },
      { 'بيان الميزانية': 'الاحتياج المتبقي غير المغطى من الميزانية (ج.م)', 'القيمة الرقمية': allocation.summary.unmetNeed },
      { 'بيان الميزانية': 'عدد الحالات المستفيدة من الدعم', 'القيمة الرقمية': allocation.summary.fundedCasesCount },
      { 'بيان الميزانية': 'عدد الحالات المستبعدة هذا الشهر', 'القيمة الرقمية': allocation.summary.excludedCasesCount },
      { 'بيان الميزانية': 'المسؤول المعتمد', 'القيمة الرقمية': allocation.approvedBy || 'قيد المراجعة الإدارية' },
      { 'بيان الميزانية': 'تاريخ الاعتماد / الإنشاء', 'القيمة الرقمية': allocation.approvedDate || allocation.generatedDate },
    ];

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 38 }, { wch: 35 }];
    summaryWorksheet['!views'] = [{ rightToLeft: true }];

    // 3. تجميع المصنف
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, itemsWorksheet, 'كشف المستحقين والتخصيص');
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'الملخص المالي والرقابي');

    const fileName = options?.customFileName || `تقرير_تخصيص_المساعدات_${allocation.period}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Failed to export Excel report:', error);
    throw error;
  }
}

/**
 * تصدير تقرير الحالات الاستثنائية ونقص المستندات
 */
export function exportExceptionsToExcel(exceptionCases: BeneficiaryCase[]): void {
  try {
    const data = exceptionCases.map((c, index) => ({
      'م': index + 1,
      'كود الحالة': c.code,
      'اسم المستفيد': c.fullName,
      'الرقم القومي': c.nationalId,
      'العنوان والحي': `${c.governorate || ''} - ${c.district || ''} - ${c.address || ''}`,
      'الهاتف': c.phone || 'غير مسجل',
      'الباحث المسؤول': c.assignedResearcher || 'غير محدد',
      'نسبة ثقة الباحث': `${c.vulnerability.confidenceScore}%`,
      'حالة الاعتماد الاستثنائي': c.vulnerability.exceptionApproved
        ? `معتمدة كاستثناء إنساني (${c.vulnerability.exceptionApprovedBy || 'الإدارة'})`
        : 'بانتظار قرار الاعتماد الإداري',
      'تاريخ آخر بحث ميداني': c.lastVisitDate || '—',
      'مبرر الاستثناء': c.vulnerability.exceptionReason || 'غير محدد',
      'المستندات الناقصة': c.vulnerability.incompleteDocuments ? 'يوجد نقص في المستندات الرسمية' : 'مستوفاة',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 30 },
      { wch: 18 },
      { wch: 35 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
      { wch: 16 },
      { wch: 40 },
      { wch: 25 },
    ];
    worksheet['!views'] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الحالات الاستثنائية');
    XLSX.writeFile(workbook, `تقرير_الحالات_الاستثنائية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export exceptions Excel report:', error);
    throw error;
  }
}

/**
 * تصدير كشف الحالات المتأخرة في الزيارات الميدانية
 */
export function exportOverdueToExcel(overdueCases: BeneficiaryCase[]): void {
  try {
    const data = overdueCases.map((c, index) => ({
      'م': index + 1,
      'كود الحالة': c.code,
      'اسم المستفيد': c.fullName,
      'الرقم القومي': c.nationalId,
      'العنوان والحي': `${c.district || ''} - ${c.address || ''}`,
      'الهاتف': c.phone || 'غير مسجل',
      'الباحث المسؤول': c.assignedResearcher || 'غير محدد',
      'تاريخ آخر زيارة': c.lastVisitDate,
      'تاريخ الاستحقاق المتجاوز': c.nextVisitDueDate,
      'الإجراء المطلوب': 'تجديد البحث الميداني فوراً',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 30 },
      { wch: 18 },
      { wch: 35 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 25 },
    ];
    worksheet['!views'] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الزيارات المتأخرة');
    XLSX.writeFile(workbook, `تقرير_الزيارات_المتأخرة_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export overdue Excel report:', error);
    throw error;
  }
}

/**
 * تصدير كشف أذونات الصرف المالي الفوري
 */
export function exportVouchersToExcel(orders: FastTrackDisbursementOrder[]): void {
  try {
    const data = orders.map((o, index) => ({
      'م': index + 1,
      'كود الإذن': o.voucherCode,
      'اسم المستفيد': o.beneficiaryPrimaryName + (o.beneficiarySecondaryName ? ` (${o.beneficiarySecondaryName})` : ''),
      'الرقم القومي': o.beneficiaryNationalId,
      'المبلغ المصروف (ج.م)': o.amount,
      'المصرف الشرعي': o.shariaCategoryName,
      'الباحث المكلف بالصرف': o.assignedResearcher,
      'تاريخ التحرير': o.issuedDate,
      'حالة التسليم': o.status === 'delivered' ? 'تم التسليم الميداني' : 'قيد التسليم',
      'الغرض المشروط': o.purposeNote || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 32 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 35 },
    ];
    worksheet['!views'] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أذونات الصرف الفوري');
    XLSX.writeFile(workbook, `كشف_أذونات_الصرف_الفوري_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export vouchers Excel report:', error);
    throw error;
  }
}

/**
 * تصدير كشف التبرعات والأرصدة المقيدة
 */
export function exportDonationsToExcel(donations: Donation[]): void {
  try {
    const data = donations.map((d, index) => ({
      'م': index + 1,
      'كود التبرع': d.donorReference,
      'اسم المتبرع': d.donorName,
      'المبلغ (ج.م)': d.amount,
      'تاريخ التحصيل': d.receivedDate,
      'قناة التحصيل': d.channel,
      'نوع التقييد': d.restrictionType === 'unrestricted' ? 'عام مفتوح' : d.restrictionType === 'restricted_purpose' ? 'مقيد بغرض' : 'مقيد بالاسم',
      'ملاحظات والتزام الصرف': d.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 35 },
    ];
    worksheet['!views'] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل التبرعات');
    XLSX.writeFile(workbook, `كشف_التبرعات_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export donations Excel report:', error);
    throw error;
  }
}

