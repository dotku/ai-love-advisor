import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { Analytics } from '@vercel/analytics/react';
import '../globals.css';

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (locales.includes(lang as Locale) ? lang : 'zh') as Locale;
  const dict = await getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-love-advisor.vercel.app';
  const otherLocale = locale === 'zh' ? 'en' : 'zh';
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        [locale]: `${baseUrl}/${locale}`,
        [otherLocale]: `${baseUrl}/${otherLocale}`,
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: `${baseUrl}/${locale}`,
      siteName: locale === 'zh' ? 'AI 恋爱军师' : 'AI Love Advisor',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (locales.includes(lang as Locale) ? lang : 'zh') as Locale;
  const dict = await getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-love-advisor.vercel.app';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: locale === 'zh' ? 'AI 恋爱军师' : 'AI Love Advisor',
    description: dict.meta.description,
    url: `${baseUrl}/${locale}`,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
  };

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gradient-to-br from-pink-50 via-white to-purple-50">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
