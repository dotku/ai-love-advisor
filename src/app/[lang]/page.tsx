import type { Locale } from '@/i18n/config';
import { locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import ChatApp from '@/components/ChatApp';

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (locales.includes(lang as Locale) ? lang : 'zh') as Locale;
  const dict = await getDictionary(locale);
  return <ChatApp dict={dict} lang={locale} />;
}
