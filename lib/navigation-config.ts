export interface SectionMeta {
  id: string;
  sidebarLabel: string;
  headerTitle: string;
  headerDescription: string;
}

export const NAVIGATION_SECTIONS: Record<string, SectionMeta> = {
  dashboard: {
    id: 'dashboard',
    sidebarLabel: 'الصفحة الرئيسية',
    headerTitle: 'الصفحة الرئيسية وأبرز الأرقام',
    headerDescription: 'متابعة حركة المساعدات، الصناديق، والحالات النشطة بشكل مباشر وموجز.',
  },
  cases: {
    id: 'cases',
    sidebarLabel: 'إدارة المستحقين',
    headerTitle: 'سجل المستحقين والأسر',
    headerDescription: 'بيانات الأسر والحالات المسجلة وملفاتهم الميدانية.',
  },
  'cases-review': {
    id: 'cases-review',
    sidebarLabel: 'أبحاث بانتظار الاعتماد',
    headerTitle: 'أبحاث بانتظار المراجعة والاعتماد',
    headerDescription: 'فحص الحالات المبحوثة ميدانياً واعتماد استحقاقها للدعم.',
  },
  review: {
    id: 'cases-review',
    sidebarLabel: 'أبحاث بانتظار الاعتماد',
    headerTitle: 'أبحاث بانتظار المراجعة والاعتماد',
    headerDescription: 'فحص الحالات المبحوثة ميدانياً واعتماد استحقاقها للدعم.',
  },
  research: {
    id: 'research',
    sidebarLabel: 'البحث والزيارات الميدانية',
    headerTitle: 'الزيارات الميدانية والمتابعة',
    headerDescription: 'جدول نزول الباحثين ومتابعة تجديد أبحاث الأسر.',
  },
  'researcher-profile': {
    id: 'researcher-profile',
    sidebarLabel: 'ملف الباحث والمتطوع',
    headerTitle: 'فريق البحث الميداني',
    headerDescription: 'بيانات الباحثين، نطاقات العمل الميداني، ومتابعة العهد.',
  },
  donations: {
    id: 'donations',
    sidebarLabel: 'إدارة التبرعات',
    headerTitle: 'حركة التبرعات والمصارف',
    headerDescription: 'متابعة الصناديق والمحفظة وحصيلة أموال الصدقات والزكاة.',
  },
  'fast-track': {
    id: 'fast-track',
    sidebarLabel: 'الصرف الفوري والمقيد',
    headerTitle: 'الصرف الطارئ والمقيد',
    headerDescription: 'إصدار أذونات المساعدات العاجلة والحالات الطارئة.',
  },
  allocation: {
    id: 'allocation',
    sidebarLabel: 'توزيع الميزانية الشهرية',
    headerTitle: 'توزيع ميزانية الشهر وكشوف الصرف',
    headerDescription: 'تخصيص مبالغ الدفعة الشهرية وتحديد المعتمد للصرف الفعلي.',
  },
  'donor-portal': {
    id: 'donor-portal',
    sidebarLabel: 'بوابة المتبرعين',
    headerTitle: 'بوابة وخدمات المتبرعين',
    headerDescription: 'تقارير الشفافية وإدارة حسابات الداعمين والشركاء.',
  },
  reports: {
    id: 'reports',
    sidebarLabel: 'التقارير والكشوف',
    headerTitle: 'التقارير واستخراج الكشوف',
    headerDescription: 'إعداد وطباعة كشوف الصرف الميدانية وتصدير البيانات.',
  },
  settings: {
    id: 'settings',
    sidebarLabel: 'قواعد التقييم والإعدادات',
    headerTitle: 'إعدادات ومعايير المنظومة',
    headerDescription: 'ضبط أوزان الاستحقاق، درجات الأولوية، وصلاحيات النظام.',
  },
};

export function getSectionMeta(sectionId: string): SectionMeta {
  return (
    NAVIGATION_SECTIONS[sectionId] || {
      id: sectionId,
      sidebarLabel: 'لوحة التحكم',
      headerTitle: 'لوحة التحكم',
      headerDescription: 'إدارة ومتابعة منظومة إحسان للتكافل الاجتماعي.',
    }
  );
}
