'use client';

import React from 'react';
import { useApp } from '@/context/app-context';
import { AppUserRole } from '@/types';
import {
  Scale,
  ShieldCheck,
  Heart,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export interface RoleDailyQuote {
  verse: string;
  reference: string;
  themeLabel: string;
  reflectionTitle: string;
  reflectionText: string;
}

export interface RoleCardConfig {
  roleBadge: string;
  artCaption: string;
  accentColor: string;
  badgeStyle: string;
  borderColor: string;
  imageSrc: string;
  Icon: React.ElementType;
  quotes: RoleDailyQuote[];
}

export interface InspirationalCardData {
  verse: string;
  reference: string;
  themeLabel: string;
  roleBadge: string;
  artCaption: string;
  reflectionTitle: string;
  reflectionText: string;
  accentColor: string;
  badgeStyle: string;
  borderColor: string;
  imageSrc: string;
  Icon: React.ElementType;
}

export const ROLE_CARD_CONFIGS: Record<AppUserRole, RoleCardConfig> = {
  admin: {
    roleBadge: 'تذكرة الإدارة والقيادة',
    artCaption: 'العدل والإحسان المؤسسي',
    accentColor: '#005756',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    borderColor: 'border-emerald-900/10 hover:border-emerald-900/25',
    imageSrc: 'https://res.cloudinary.com/dlakn3n2r/image/upload/v1791915895/Gemini_Generated_Image_wj70ilwj70ilwj7067.webp',
    Icon: Scale,
    quotes: [
      {
        verse: 'إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَىٰ',
        reference: 'سورة النحل · الآية 90',
        themeLabel: 'العدل والإحسان المؤسسي',
        reflectionTitle: 'من هدي الآية في منظومة إحسان',
        reflectionText:
          'إدارة أمانة المساعدات تقوم على العدل والإنصاف في دراسة استحقاق الأسر، والتجرد في التقييم، وإيصال الحقوق لذوي الحاجة بإحسان يحفظ كرامتهم دون محاباة أو تفريط.',
      },
      {
        verse: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُونُوا قَوَّامِينَ بِالْقِسْطِ شُهَدَاءَ لِلَّهِ وَلَوْ عَلَىٰ أَنفُسِكُمْ',
        reference: 'سورة النساء · الآية 135',
        themeLabel: 'الاستقامة والشهادة بالحق',
        reflectionTitle: 'من هدي الآية في حوكمة القرارات',
        reflectionText:
          'القيادة الرشيدة في العمل الخيري ترتكز على تجرد القرار الإداري وإعلاء معايير الاستحقاق الموضوعية فوق كل اعتبار شخصي صيانةً لحقوق الضعفاء.',
      },
      {
        verse: 'وَشَاوِرْهُمْ فِي الْأَمْرِ ۖ فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ ۚ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ',
        reference: 'سورة آل عمران · الآية 159',
        themeLabel: 'الشورى وتكامل الرأي',
        reflectionTitle: 'من هدي الآية في إدارة المبادرة',
        reflectionText:
          'اتخاذ قرارات الدعم والتخصيص ينبني على مشورة فريق الباحثين والمحاسبين وتكامل الخبرات، لضمان سداد الرأي وبركة العمل الجماعي.',
      },
      {
        verse: 'إِنَّ خَيْرَ مَنِ اسْتَأْجَرْتَ الْقَوِيُّ الْأَمِينُ',
        reference: 'سورة القصص · الآية 26',
        themeLabel: 'الكفاءة والأمانة القيادية',
        reflectionTitle: 'من هدي الآية في معايير الإدارة',
        reflectionText:
          'إسناد مهام رعاية الأسر للأكفأ والأخلص يضمن وصول الدعم لمستحقيه بدقة، ويعزز بناء منظومة إنسانية متماسكة تستحق ثقة المجتمع.',
      },
    ],
  },
  finance: {
    roleBadge: 'تذكرة الأمانة المالية',
    artCaption: 'صيانة الأمانة والشفافية',
    accentColor: '#004e7c',
    badgeStyle: 'bg-cyan-50 text-cyan-900 border-cyan-200/80',
    borderColor: 'border-cyan-900/10 hover:border-cyan-900/25',
    imageSrc: 'https://res.cloudinary.com/dlakn3n2r/image/upload/t_for_you/v1791915149/Gemini_Generated_Image_u7pzswu7pzswu7pz.webp',
    Icon: ShieldCheck,
    quotes: [
      {
        verse: 'إِنَّ اللَّهَ يَأْمُرُكُمْ أَن تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا وَإِذَا حَكَمْتُم بَيْنَ النَّاسِ أَن تَحْكُمُوا بِالْعَدْلِ',
        reference: 'سورة النساء · الآية 58',
        themeLabel: 'الأمانة والنزاهة المالية',
        reflectionTitle: 'من هدي الآية في إدارة الخزينة',
        reflectionText:
          'صيانة أموال الصدقات والتبرعات بأمانة تامة وشفافية مطلقة، والوفاء الدقيق بشروط أهل الخير في الأرصدة المقيدة، وفصلها عن الصندوق العام التزاماً بالعهد وسلامة للمقصد.',
      },
      {
        verse: 'وَأَوْفُوا الْكَيْلَ وَالْمِيزَانَ بِالْقِسْطِ ۖ لَا نُكَلِّفُ نَفْسًا إِلَّا وُسْعَهَا',
        reference: 'سورة الأنعام · الآية 152',
        themeLabel: 'دقة الحسابات وإبراء الذمة',
        reflectionTitle: 'من هدي الآية في تدقيق الميزانيات',
        reflectionText:
          'التدقيق المالي الرصين وإحكام القيود المحاسبية يضمن عدم هدر أي جنيه من أموال المتبرعين ويوجه كل مساهمة إلى وجهتها الشرعية المحددة.',
      },
      {
        verse: 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ',
        reference: 'سورة المائدة · الآية 1',
        themeLabel: 'الوفاء بشروط التبرع المشروط',
        reflectionTitle: 'من هدي الآية في إدارة الصناديق المقيدة',
        reflectionText:
          'شرط الواقف والمتبرع كحكم الشارع؛ فالالتزام بتوجيه أموال كفالة الأيتام والرعاية الطبية لما خُصصت له هو أصل الوفاء بالعهد وبركة الخزينة.',
      },
      {
        verse: 'وَالَّذِينَ هُمْ لِأَمَانَاتِهِمْ وَعَهْدِهِمْ رَاعُونَ',
        reference: 'سورة المؤمنون · الآية 8',
        themeLabel: 'رعاية الأمانة وحفظ الحقوق',
        reflectionTitle: 'من هدي الآية في أمانة الصندوق',
        reflectionText:
          'المسؤول المالي حارس لأموال المحسنين وحقوق المساكين، ويقظته في التوثيق والمطابقة هي صمام الأمان المالي لمنظومة إحسان.',
      },
    ],
  },
  researcher: {
    roleBadge: 'تذكرة الباحث الميداني',
    artCaption: 'حفظ الكرامة والزيارة الميدانية',
    accentColor: '#047857',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    borderColor: 'border-emerald-900/10 hover:border-emerald-900/25',
    imageSrc: 'https://res.cloudinary.com/dlakn3n2r/image/upload/t_for_you/v1791915140/Gemini_Generated_Image_glickaglickaglic.webp',
    Icon: Heart,
    quotes: [
      {
        verse: 'قَوْلٌ مَّعْرُوفٌ وَمَغْفِرَةٌ خَيْرٌ مِّن صَدَقَةٍ يَتْبَعُهَا أَذًى ۗ وَاللَّهُ غَنِيٌّ حَلِيمٌ',
        reference: 'سورة البقرة · الآية 263',
        themeLabel: 'الرحمة وصون الكرامة والستر',
        reflectionTitle: 'من هدي الآية في الزيارات الميدانية',
        reflectionText:
          'عزة نفس الأسر المتعففة وستر أحوالهم أمانة مقدسة؛ فالكلمة الطيبة وحسن الاستماع وبشاشة الوجه أثناء الاستقصاء تسبق العطاء المادي وتبقي أثره مباركاً وطيباً.',
      },
      {
        verse: 'يَحْسَبُهُمُ الْجَاهِلُ أَغْنِيَاءَ مِنَ التَّعَفُّفِ تَعْرِفُهُم بِسِيمَاهُمْ لَا يَسْأَلُونَ النَّاسَ إِلْحَافًا',
        reference: 'سورة البقرة · الآية 273',
        themeLabel: 'فطنة التقصي ورصد المتعففين',
        reflectionTitle: 'من هدي الآية في رصد الاحتياج الخفي',
        reflectionText:
          'رسالة الباحث الميداني هي النفاذ إلى الأسر المتعففة التي يمنعها الحياء من السؤال، واكتشاف فجوة الدخل الحقيقية بحكمة وحس إنساني رفيع.',
      },
      {
        verse: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا أَن تُصِيبُوا قَوْمًا بِجَهَالَةٍ',
        reference: 'سورة الحجرات · الآية 6',
        themeLabel: 'التثبت والموضوعية الميدانية',
        reflectionTitle: 'من هدي الآية في توثيق الحالات',
        reflectionText:
          'المعاينة الميدانية الواقعية وفحص المستندات بتجرد يحمي حقوق الأسر الأشد احتياجاً ويمنع حرمان المستحقين بسبب معلومات مغلوطة أو انطباعات عابرة.',
      },
      {
        verse: 'فَبِمَا رَحْمَةٍ مِّنَ اللَّهِ لِنتَ لَهُمْ ۖ وَلَوْ كُنتَ فَظًّا غَلِيظَ الْقَلْبِ لَانفَضُّوا مِنْ حَوْلِكَ',
        reference: 'سورة آل عمران · الآية 159',
        themeLabel: 'اللين وجبر الخواطر',
        reflectionTitle: 'من هدي الآية في التعامل الإنساني',
        reflectionText:
          'دخول بيوت المحتاجين عبادة تتطلب لين الجانب وجبر الخواطر، ليكون الباحث سفيراً للرحمة ومصدر طمأنينة للأسر في أشد أوقات ضعفهم.',
      },
    ],
  },
  donor: {
    roleBadge: 'تذكرة المتبرع والمساهم الكريم',
    artCaption: 'بذرة الخير ونماء الأثر',
    accentColor: '#b45309',
    badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200/80',
    borderColor: 'border-amber-900/10 hover:border-amber-900/25',
    imageSrc: 'https://res.cloudinary.com/dlakn3n2r/image/upload/t_for_you/v1791915137/Gemini_Generated_Image_xfg3txfg3txfg3tx.webp',
    Icon: Sparkles,
    quotes: [
      {
        verse: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ ۗ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ',
        reference: 'سورة البقرة · الآية 261',
        themeLabel: 'الصدقة والبركة ونماء الأثر',
        reflectionTitle: 'من هدي الآية في بوابة العطاء',
        reflectionText:
          'كل مساهمة تجود بها هي بذرة خير ونماء يضاعف الله أثرها وبركتها؛ تفرج كربة أسرة متعففة وتثمر سداً حقيقياً لفجوات الاحتياج الإنساني في المجتمع.',
      },
      {
        verse: 'وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ ۖ وَهُوَ خَيْرُ الرَّازِقِينَ',
        reference: 'سورة سبأ · الآية 39',
        themeLabel: 'اليقين في الإخلاف والبركة',
        reflectionTitle: 'من هدي الآية في طمأنينة الباذل',
        reflectionText:
          'عطاء الخير لا ينقص مالاً بل يزكيه ويفتح أبواب التوفيق والبركة في الرزق، فما يُبذل في سد حاجة مريض أو يتيم محفوظ ومخلوف بوعد الله الحق.',
      },
      {
        verse: 'الَّذِينَ يُنفِقُونَ أَمْوَالَهُم بِاللَّيْلِ وَالنَّهَارِ سِرًّا وَعَلَانِيَةً فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ',
        reference: 'سورة البقرة · الآية 274',
        themeLabel: 'السكينة والأمان الإلهي',
        reflectionTitle: 'من هدي الآية في أثر الإنفاق',
        reflectionText:
          'استدامة البذل في السر والعلن تورث القلب سكينة وأماناً وتدفع المكاره، وتجعل أثرك الإنساني شاهداً حياً يمتد في حياة الأسر المستفيدة.',
      },
      {
        verse: 'إِنَّ الَّذِينَ يَتْلُونَ كِتَابَ اللَّهِ وَأَقَامُوا الصَّلَاةَ وَأَنفَقُوا مِمَّا رَزَقْنَاهُمْ سِرًّا وَعَلَانِيَةً يَرْجُونَ تِجَارَةً لَّن تَبُورَ',
        reference: 'سورة فاطر · الآية 29',
        themeLabel: 'التجارة الرابحة مع الله',
        reflectionTitle: 'من هدي الآية في نماء الصدقات',
        reflectionText:
          'مشاركتك في كفالة الحالات ودعم برامج إحسان هي تجارة رابحة موثقة بالأثر، تثمر فرجاً عاجلاً للمستحقين وأجراً باقياً لا ينقطع.',
      },
    ],
  },
};

/**
 * دالة حسابية تعتمد على تاريخ اليوم (رقم اليوم في السنة) لاختيار الآية اليومية تلقائياً
 * تتبدل الآية كل 24 ساعة دورياً لكل دور
 */
export function getDailyQuoteIndex(quotesLength: number): number {
  if (quotesLength <= 1) return 0;
  // Use UTC day calculation to prevent timezone discrepancies between SSR and client
  const utcDay = Math.floor(Date.now() / 86400000);
  return Math.abs(utcDay) % quotesLength;
}

export function getDailyInspirationalCard(role: AppUserRole): InspirationalCardData {
  const config = ROLE_CARD_CONFIGS[role] || ROLE_CARD_CONFIGS.admin;
  const quoteIndex = getDailyQuoteIndex(config.quotes.length);
  const activeQuote = config.quotes[quoteIndex] || config.quotes[0];

  return {
    verse: activeQuote.verse,
    reference: activeQuote.reference,
    themeLabel: activeQuote.themeLabel,
    reflectionTitle: activeQuote.reflectionTitle,
    reflectionText: activeQuote.reflectionText,
    roleBadge: config.roleBadge,
    artCaption: config.artCaption,
    accentColor: config.accentColor,
    badgeStyle: config.badgeStyle,
    borderColor: config.borderColor,
    imageSrc: config.imageSrc,
    Icon: config.Icon,
  };
}

export const INSPIRATIONAL_CARDS: Record<AppUserRole, InspirationalCardData> = {
  admin: getDailyInspirationalCard('admin'),
  finance: getDailyInspirationalCard('finance'),
  researcher: getDailyInspirationalCard('researcher'),
  donor: getDailyInspirationalCard('donor'),
};

/**
 * Expressive Humanitarian Artistic SVG Illustrations
 * Hand-crafted with rich gradients, layered lighting and human solidarity motifs
 * Harmonized with the platform's emerald, deep teal, and warm gold colors.
 */
function RoleHumanitarianArt({ role, caption }: { role: AppUserRole; caption: string }) {
  return (
    <div className="relative w-full h-full min-h-[160px] md:min-h-[175px] flex items-center justify-center overflow-hidden select-none bg-slate-900">
      {role === 'admin' && (
        <svg
          viewBox="0 0 320 220"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="adminSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#004241" />
              <stop offset="60%" stopColor="#005756" />
              <stop offset="100%" stopColor="#0f2b2a" />
            </linearGradient>
            <radialGradient id="adminGlow" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="adminGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* Background Sky & Ambient Glow */}
          <rect width="320" height="220" fill="url(#adminSky)" />
          <rect width="320" height="220" fill="url(#adminGlow)" />

          {/* Architectural Archway of Justice & Community */}
          <path
            d="M 60 220 L 60 90 Q 160 20 260 90 L 260 220 Z"
            fill="none"
            stroke="rgba(251, 191, 36, 0.22)"
            strokeWidth="1.5"
          />
          <path
            d="M 80 220 L 80 100 Q 160 40 240 100 L 240 220 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Sun Rays of Equity */}
          <line x1="160" y1="65" x2="100" y2="130" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="160" y1="65" x2="160" y2="140" stroke="rgba(251, 191, 36, 0.25)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="160" y1="65" x2="220" y2="130" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Glowing Emblem: Scales of Justice Balanced Above Community */}
          <circle cx="160" cy="65" r="14" fill="#003534" stroke="url(#adminGold)" strokeWidth="1.5" />
          <path d="M 160 55 L 160 75 M 150 63 L 170 63" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 148 63 L 144 71 Q 150 74 156 71 Z" fill="#fbbf24" opacity="0.9" />
          <path d="M 172 63 L 164 71 Q 170 74 176 71 Z" fill="#fbbf24" opacity="0.9" />

          {/* Stylized Human Figures / Community Gathering in Dignified Mutual Aid */}
          {/* Central Elder & Beneficiary */}
          <ellipse cx="160" cy="148" rx="8" ry="9" fill="#fde68a" opacity="0.9" />
          <path d="M 145 220 L 148 165 Q 160 160 172 165 L 175 220 Z" fill="#0d4a49" />

          {/* Community Members / Solidarity Silhouette Left */}
          <ellipse cx="120" cy="155" rx="7" ry="8" fill="#fef3c7" opacity="0.8" />
          <path d="M 108 220 L 111 170 Q 120 166 129 170 L 132 220 Z" fill="#063534" />
          {/* Arm extending in assistance */}
          <path d="M 125 174 Q 142 178 152 172" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Community Member Right */}
          <ellipse cx="200" cy="155" rx="7" ry="8" fill="#fef3c7" opacity="0.8" />
          <path d="M 188 220 L 191 170 Q 200 166 209 170 L 212 220 Z" fill="#063534" />
          {/* Arm extending with relief parcel */}
          <path d="M 195 174 Q 178 178 168 172" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <rect x="154" y="166" width="12" height="10" rx="2" fill="url(#adminGold)" />

          {/* Peaceful Olive Branches at Base */}
          <path d="M 40 210 Q 70 195 100 205" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="1.5" fill="none" />
          <path d="M 280 210 Q 250 195 220 205" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="1.5" fill="none" />
        </svg>
      )}

      {role === 'finance' && (
        <svg
          viewBox="0 0 320 220"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="finSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#002b42" />
            </linearGradient>
            <radialGradient id="finGlow" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="finGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Background Canvas */}
          <rect width="320" height="220" fill="url(#finSky)" />
          <rect width="320" height="220" fill="url(#finGlow)" />

          {/* Geometric Islamic Vaulting Lines */}
          <polygon points="160,20 220,70 160,120 100,70" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <polygon points="160,35 205,70 160,105 115,70" fill="none" stroke="rgba(251,191,36,0.18)" strokeWidth="1" />

          {/* Central Sacred Trust & Coffer with Transparent Ledger */}
          <g transform="translate(160, 105)">
            {/* Luminous Trust Shield */}
            <path
              d="M 0 -45 Q 35 -40 40 0 Q 35 45 0 60 Q -35 45 -40 0 Q -35 -40 0 -45 Z"
              fill="#033d59"
              stroke="url(#finGold)"
              strokeWidth="1.5"
              opacity="0.95"
            />
            {/* Inner Keyhole / Lock of Integrity */}
            <circle cx="0" cy="-5" r="7" fill="#fbbf24" />
            <path d="M -3 -3 L 3 -3 L 5 18 L -5 18 Z" fill="#fbbf24" />

            {/* Glowing Golden Tokens / Streams of Transparent Charity */}
            <circle cx="-20" cy="-22" r="4.5" fill="#fde047" opacity="0.9" />
            <circle cx="22" cy="-18" r="4" fill="#fde047" opacity="0.9" />
            <circle cx="-16" cy="22" r="3.5" fill="#fde047" opacity="0.8" />
            <circle cx="18" cy="24" r="3.5" fill="#fde047" opacity="0.8" />
          </g>

          {/* Protective Hands Supporting the Trust at Base */}
          <path
            d="M 70 220 Q 110 180 145 175 Q 160 178 160 190 L 160 220 Z"
            fill="#062233"
            opacity="0.9"
          />
          <path
            d="M 250 220 Q 210 180 175 175 Q 160 178 160 190 L 160 220 Z"
            fill="#082b3d"
            opacity="0.95"
          />

          {/* Laurel of Honor & Trust Boundaries */}
          <path d="M 70 145 Q 90 90 130 65" stroke="rgba(251, 191, 36, 0.35)" strokeWidth="1.5" fill="none" strokeDasharray="2 3" />
          <path d="M 250 145 Q 230 90 190 65" stroke="rgba(251, 191, 36, 0.35)" strokeWidth="1.5" fill="none" strokeDasharray="2 3" />
        </svg>
      )}

      {role === 'researcher' && (
        <svg
          viewBox="0 0 320 220"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="resSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="60%" stopColor="#166534" />
              <stop offset="100%" stopColor="#052e16" />
            </linearGradient>
            <radialGradient id="resLantern" cx="62%" cy="40%" r="45%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="resGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* Canvas Sky & Warm Lantern Radiance */}
          <rect width="320" height="220" fill="url(#resSky)" />
          <rect width="320" height="220" fill="url(#resLantern)" />

          {/* Doorway Arch of the Humble Family Home */}
          <path
            d="M 120 220 L 120 85 Q 195 40 270 85 L 270 220 Z"
            fill="none"
            stroke="rgba(254, 240, 138, 0.2)"
            strokeWidth="1.5"
          />

          {/* Crescent Moon in the Peaceful Night Sky */}
          <path
            d="M 50 45 A 15 15 0 0 0 70 32 A 13 13 0 0 1 50 45 Z"
            fill="#fef08a"
            opacity="0.85"
          />

          {/* Distant Palm Fronds Framing the Scene */}
          <path d="M 10 220 Q 30 140 70 120" stroke="rgba(22, 101, 52, 0.7)" strokeWidth="3" fill="none" />
          <path d="M 70 120 Q 45 105 20 115 M 70 120 Q 55 95 35 90 M 70 120 Q 80 90 70 75" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" fill="none" />

          {/* Touch of Grace: Humanitarian Field Researcher (Left) */}
          {/* Head & Vest Silhouette */}
          <ellipse cx="140" cy="130" rx="7.5" ry="8.5" fill="#fde68a" />
          {/* Body bowing gently with respect and humility */}
          <path
            d="M 125 220 L 128 150 Q 140 145 152 148 L 156 220 Z"
            fill="#064e3b"
          />
          {/* Green Volunteer Vest with Reflective Stripe */}
          <path d="M 132 150 L 148 150 L 146 175 L 134 175 Z" fill="#047857" />
          <line x1="133" y1="162" x2="147" y2="162" stroke="#fef08a" strokeWidth="1.5" />

          {/* Extended arms offering sustenance basket with two hands */}
          <path d="M 148 155 Q 165 162 178 156" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Aid Basket with woven texture */}
          <ellipse cx="180" cy="158" rx="8" ry="6" fill="#b45309" stroke="#fde68a" strokeWidth="1" />
          <path d="M 172 158 Q 180 152 188 158" stroke="#fde68a" strokeWidth="1.2" fill="none" />

          {/* The Humble Elder / Beneficiary (Right) Welcoming with Dignity */}
          <ellipse cx="218" cy="134" rx="7" ry="8" fill="#fde68a" opacity="0.9" />
          {/* Dignified modest cloak */}
          <path
            d="M 205 220 L 208 152 Q 220 148 230 152 L 235 220 Z"
            fill="#052e16"
          />
          {/* Gentle receiving hand with dignity, preserving self-esteem */}
          <path d="M 212 158 Q 198 162 186 158" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Soft Amber Glow on Threshold */}
          <ellipse cx="180" cy="205" rx="45" ry="10" fill="#f59e0b" opacity="0.15" />
        </svg>
      )}

      {role === 'donor' && (
        <svg
          viewBox="0 0 320 220"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="donSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="45%" stopColor="#92400e" />
              <stop offset="85%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <radialGradient id="donDawn" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="donWheat" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
          </defs>

          {/* Dawn Canvas & Generous Golden Glow */}
          <rect width="320" height="220" fill="url(#donSky)" />
          <rect width="320" height="220" fill="url(#donDawn)" />

          {/* Radiant Dawn Light Rays Emanating from Good Deed */}
          <line x1="160" y1="110" x2="80" y2="20" stroke="rgba(254, 240, 138, 0.25)" strokeWidth="1.2" strokeDasharray="3 3" />
          <line x1="160" y1="110" x2="160" y2="10" stroke="rgba(254, 240, 138, 0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="160" y1="110" x2="240" y2="20" stroke="rgba(254, 240, 138, 0.25)" strokeWidth="1.2" strokeDasharray="3 3" />

          {/* Seven Golden Wheat Stalks (سبع سنابل مضاعفة الأجر) */}
          {/* Central Tall Stalk */}
          <path d="M 160 210 Q 160 140 160 70" stroke="url(#donWheat)" strokeWidth="2.5" fill="none" />
          {/* Golden Grains along stalk */}
          <ellipse cx="157" cy="80" rx="3.5" ry="7" transform="rotate(-20 157 80)" fill="#fef08a" />
          <ellipse cx="163" cy="80" rx="3.5" ry="7" transform="rotate(20 163 80)" fill="#fef08a" />
          <ellipse cx="157" cy="98" rx="3.5" ry="7" transform="rotate(-25 157 98)" fill="#fde047" />
          <ellipse cx="163" cy="98" rx="3.5" ry="7" transform="rotate(25 163 98)" fill="#fde047" />
          <ellipse cx="160" cy="65" rx="3" ry="8" fill="#fffbeb" />

          {/* Left Wheat Stalks */}
          <path d="M 150 210 Q 140 150 120 90" stroke="url(#donWheat)" strokeWidth="2" fill="none" />
          <ellipse cx="118" cy="96" rx="3" ry="6" transform="rotate(-35 118 96)" fill="#fde047" />
          <ellipse cx="125" cy="102" rx="3" ry="6" transform="rotate(10 125 102)" fill="#fde047" />

          <path d="M 140 210 Q 120 160 90 115" stroke="url(#donWheat)" strokeWidth="1.8" fill="none" />
          <ellipse cx="88" cy="120" rx="3" ry="6" transform="rotate(-45 88 120)" fill="#fde047" />

          {/* Right Wheat Stalks */}
          <path d="M 170 210 Q 180 150 200 90" stroke="url(#donWheat)" strokeWidth="2" fill="none" />
          <ellipse cx="202" cy="96" rx="3" ry="6" transform="rotate(35 202 96)" fill="#fde047" />
          <ellipse cx="195" cy="102" rx="3" ry="6" transform="rotate(-10 195 102)" fill="#fde047" />

          <path d="M 180 210 Q 200 160 230 115" stroke="url(#donWheat)" strokeWidth="1.8" fill="none" />
          <ellipse cx="232" cy="120" rx="3" ry="6" transform="rotate(45 232 120)" fill="#fde047" />

          {/* Hands of Benevolence at the base, planting seeds of charity into fertile earth */}
          <path
            d="M 80 220 Q 130 190 155 190 Q 160 195 160 220 Z"
            fill="#451a03"
            opacity="0.8"
          />
          <path
            d="M 240 220 Q 190 190 165 190 Q 160 195 160 220 Z"
            fill="#3f1d0b"
            opacity="0.85"
          />
          {/* Luminous Seed of Giving in Center */}
          <circle cx="160" cy="188" r="5" fill="#fef08a" />
          <circle cx="160" cy="188" r="9" fill="none" stroke="rgba(254, 240, 138, 0.4)" strokeWidth="1" />
        </svg>
      )}

      {/* Aesthetic Vignette & Fine Art Matte Borders */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none" />

      {/* Museum Artwork Caption Ribbon */}
      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] text-white/90 px-2 py-1 rounded bg-black/40 backdrop-blur-xs border border-white/10">
        <span className="font-medium tracking-wide truncate">{caption}</span>
        <span className="text-[9px] text-amber-300 font-mono shrink-0">إحسان</span>
      </div>
    </div>
  );
}

function RoleCardVisual({
  imageSrc,
  caption,
  role,
}: {
  imageSrc: string;
  caption: string;
  role: AppUserRole;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <div className="relative w-full h-full min-h-[220px] md:min-h-[240px] flex items-center justify-center overflow-hidden select-none bg-gradient-to-br from-slate-900 via-[#004241] to-slate-900">
      {!imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={caption}
          className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="relative w-full h-full">
          <RoleHumanitarianArt role={role} caption={caption} />
        </div>
      )}

      {/* Aesthetic Vignette & Matte Border Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none" />

      {/* Original Image Caption Ribbon */}
      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[11px] text-white/95 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-xs border border-white/15">
        <span className="font-medium tracking-wide truncate">{caption}</span>
        <span className="text-[9px] text-amber-300 font-mono shrink-0">إحسان</span>
      </div>
    </div>
  );
}

interface RoleInspirationalCardProps {
  role?: AppUserRole;
  className?: string;
}

export function RoleInspirationalCard({ role, className = '' }: RoleInspirationalCardProps) {
  const { currentUserRole } = useApp();
  const activeRole = role || currentUserRole;
  const cardData = getDailyInspirationalCard(activeRole);
  const IconComponent = cardData.Icon;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/60 ring-1 ring-black/[0.03] shadow-sm shadow-slate-950/5 overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* 
        Layout: In RTL reading direction:
        - Child 1: Content Panel (Text) appears on the RIGHT (اليمين)
        - Child 2: Visual Panel (Image) appears on the LEFT (اليسار بصرياً)
        - On mobile: Responsive stacking (Image on top via flex-col-reverse, or clean natural flow)
      */}
      <div className="flex flex-col-reverse md:flex-row items-stretch">
        {/* 1. Content Panel (الجانب الأيمن للنصوص في RTL) */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-4 min-w-0 flex-1">
          {/* Top Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-bold text-slate-900 tracking-tight">
                <BookOpen size={14} className="text-[#005756] shrink-0" />
                <span>{cardData.roleBadge}</span>
              </span>
              <span className="text-slate-300 select-none">·</span>
              <span className="text-slate-600 font-semibold">{cardData.themeLabel}</span>
            </div>

            {/* Quranic Citation */}
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${cardData.badgeStyle}`}
            >
              {cardData.reference}
            </span>
          </div>

          {/* Prominent Quranic Verse */}
          <div className="py-1.5">
            <blockquote className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-relaxed font-serif tracking-normal text-right">
              <span className="text-amber-600 font-serif font-normal text-xl sm:text-2xl select-none ml-1.5">
                ﴿
              </span>
              {cardData.verse}
              <span className="text-amber-600 font-serif font-normal text-xl sm:text-2xl select-none mr-1.5">
                ﴾
              </span>
            </blockquote>
          </div>

          {/* Institutional Reflection Connecting Meaning to Ihsan Operations */}
          <div className="pt-3 border-t border-slate-100 flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-teal-50 text-[#005756] border border-teal-100 mt-0.5">
              <IconComponent size={14} />
            </div>
            <p className="min-w-0">
              <strong className="text-slate-900 font-bold ml-1">
                {cardData.reflectionTitle}:
              </strong>
              {cardData.reflectionText}
            </p>
          </div>
        </div>

        {/* 2. Visual Panel: Original Image Asset (الجانب الأيسر بصرياً في RTL) */}
        <div className="w-full md:w-64 lg:w-72 xl:w-80 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80">
          <RoleCardVisual
            imageSrc={cardData.imageSrc}
            caption={cardData.artCaption}
            role={activeRole}
          />
        </div>
      </div>
    </div>
  );
}
