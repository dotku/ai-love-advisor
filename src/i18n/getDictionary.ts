import type { Locale } from './config';

const dictionaries = {
  zh: () => import('./dictionaries/zh.json').then((m) => m.default),
  en: () => import('./dictionaries/en.json').then((m) => m.default),
};

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
