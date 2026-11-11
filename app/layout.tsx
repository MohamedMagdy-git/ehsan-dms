import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/common/service-worker-register';

export const viewport: Viewport = {
  themeColor: '#005756',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'منظومة إحسان | إدارة المستحقين وتخصيص المساعدات',
  description: 'منصة شاملة لإدارة حالات المستحقين، والبحث الميداني الدوري، وإدارة التبرعات، وتخصيص الميزانية الشهرية المتغيرة وفق معايير الاحتياج والأولوية.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'إحسان',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'منظومة إحسان | إدارة المستحقين وتخصيص المساعدات',
    description: 'منصة شاملة لإدارة حالات المستحقين، والبحث الميداني الدوري، وإدارة التبرعات، وتخصيص الميزانية الشهرية المتغيرة.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'منظومة إحسان | إدارة المستحقين وتخصيص المساعدات',
    description: 'منصة شاملة لإدارة حالات المستحقين، والبحث الميداني الدوري، وإدارة التبرعات، وتخصيص الميزانية الشهرية المتغيرة.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full overflow-x-hidden" suppressHydrationWarning>
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-teal-700 selection:text-white overflow-x-hidden w-full" suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

