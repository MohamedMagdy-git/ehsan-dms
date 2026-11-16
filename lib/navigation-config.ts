export interface SectionMeta {
  id: string;
  sidebarLabel: string;
  mobileTitle: string;
  headerTitle: string;
  headerDescription: string;
}

export const NAVIGATION_SECTIONS: Record<string, SectionMeta> = {
  dashboard: {
    id: 'dashboard',
    sidebarLabel: 'الصفحة الرئيسية',
    mobileTitle: 'الرئيسية',
    headerTitle: 'الصفحة الرئيسية وأبرز الأرقام',
    headerDescription: 'متابعة حركة المساعدات، الصناديق، والحالات النشطة بشكل مباشر وموجز.',
  },
  cases: {
    id: 'cases',
    sidebarLabel: 'إدارة المستحقين',
    mobileTitle: 'إدارة المستحقين',
    headerTitle: 'سجل المستحقين والأسر',
    headerDescription: 'بيانات الأسر والحالات المسجلة وملفاتهم الميدانية.',
  },
  'cases-review': {
    id: 'cases-review',
    sidebarLabel: 'أبحاث بانتظار الاعتماد',
    mobileTitle: 'اعتماد الأبحاث',
    headerTitle: 'أبحاث بانتظار المراجعة والاعتماد',
    headerDescription: 'فحص الحالات المبحوثة ميدانياً واعتماد استحقاقها للدعم.',
  },
  review: {
    id: 'cases-review',
    sidebarLabel: 'أبحاث بانتظار الاعتماد',
    mobileTitle: 'اعتماد الأبحاث',
    headerTitle: 'أبحاث بانتظار المراجعة والاعتماد',
    headerDescription: 'فحص الحالات المبحوثة ميدانياً واعتماد استحقاقها للدعم.',
  },
  research: {
    id: 'research',
    sidebarLabel: 'البحث والزيارات الميدانية',
    mobileTitle: 'بحث الحالة',
    headerTitle: 'الزيارات الميدانية والمتابعة',
    headerDescription: 'متابعة نزول الباحثين، الزيارات المتأخرة، وتحديث بيانات الأسر.',
  },
  'researcher-profile': {
    id: 'researcher-profile',
    sidebarLabel: 'ملف الباحث والمتطوع',
    mobileTitle: 'فريق البحث الميداني',
    headerTitle: 'فريق البحث الميداني',
    headerDescription: 'بيانات الباحثين، نطاقات العمل الميداني، ومتابعة العهد.',
  },
  donations: {
    id: 'donations',
    sidebarLabel: 'سجل التبرعات',
    mobileTitle: 'سجل التبرعات',
    headerTitle: 'سجل التبرعات',
    headerDescription: 'متابعة التبرعات المستلمة والتعهدات المسجلة في الخزينة.',
  },
  'fast-track': {
    id: 'fast-track',
    sidebarLabel: 'الصرف الفوري والمقيد',
    mobileTitle: 'الصرف الفوري',
    headerTitle: 'الصرف الطارئ والمقيد',
    headerDescription: 'إصدار أذونات المساعدات العاجلة والحالات الطارئة.',
  },
  allocation: {
    id: 'allocation',
    sidebarLabel: 'توزيع الميزانية الشهرية',
    mobileTitle: 'توزيع الميزانية',
    headerTitle: 'توزيع ميزانية الشهر وكشوف الصرف',
    headerDescription: 'تخصيص مبالغ الدفعة الشهرية وتحديد المعتمد للصرف الفعلي.',
  },
  'donor-portal': {
    id: 'donor-portal',
    sidebarLabel: 'بوابة المتبرعين',
    mobileTitle: 'بوابة المتبرعين',
    headerTitle: 'بوابة وخدمات المتبرعين',
    headerDescription: 'تقارير الشفافية وإدارة حسابات الداعمين والشركاء.',
  },
  reports: {
    id: 'reports',
    sidebarLabel: 'التقارير والكشوف',
    mobileTitle: 'التقارير',
    headerTitle: 'التقارير واستخراج الكشوف',
    headerDescription: 'إعداد وطباعة كشوف الصرف الميدانية وتصدير البيانات.',
  },
  settings: {
    id: 'settings',
    sidebarLabel: 'قواعد التقييم والإعدادات',
    mobileTitle: 'الإعدادات',
    headerTitle: 'إعدادات ومعايير المنظومة',
    headerDescription: 'ضبط أوزان الاستحقاق، درجات الأولوية، وصلاحيات النظام.',
  },
};

export function getSectionMeta(sectionId: string): SectionMeta {
  return (
    NAVIGATION_SECTIONS[sectionId] || {
      id: sectionId,
      sidebarLabel: 'لوحة التحكم',
      mobileTitle: 'الرئيسية',
      headerTitle: 'الصفحة الرئيسية وأبرز الأرقام',
      headerDescription: 'إدارة ومتابعة منظومة إحسان للتكافل الاجتماعي.',
    }
  );
}
