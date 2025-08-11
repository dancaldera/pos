import en from './en'
import es from './es'

export const resources = {
  en,
  es,
}

export type Language = 'en' | 'es'
export type TranslationKey = keyof typeof en
export type NestedTranslationKey<T extends TranslationKey> = keyof (typeof en)[T]

/**
 * Gets a translation by key
 * @param lang The language code
 * @param key The section key
 * @param subKey The specific translation key
 * @returns The translated text
 */
export function getTranslation<T extends TranslationKey>(
  lang: Language,
  key: T,
  subKey: NestedTranslationKey<T>
): string {
  const translations = resources[lang]
  if (!translations) {
    console.warn(`Language ${lang} not found`)
    return `${String(key)}.${String(subKey)}`
  }

  const section = translations[key]
  if (!section) {
    console.warn(`Translation section ${key} not found for language ${lang}`)
    return `${String(key)}.${String(subKey)}`
  }

  const translation = section[subKey as keyof typeof section]
  if (!translation) {
    console.warn(`Translation key ${key}.${String(subKey)} not found for language ${lang}`)
    return `${String(key)}.${String(subKey)}`
  }

  return translation as string
}

/**
 * A utility object that returns a function for each translation section
 */
export const createTranslate = (language: Language) => {
  return {
    common: (key: NestedTranslationKey<'common'>) => getTranslation(language, 'common', key),
    auth: (key: NestedTranslationKey<'auth'>) => getTranslation(language, 'auth', key),
    dashboard: (key: NestedTranslationKey<'dashboard'>) =>
      getTranslation(language, 'dashboard', key),
    orders: (key: NestedTranslationKey<'orders'>) => getTranslation(language, 'orders', key),
    products: (key: NestedTranslationKey<'products'>) => getTranslation(language, 'products', key),
    customers: (key: NestedTranslationKey<'customers'>) =>
      getTranslation(language, 'customers', key),
    categories: (key: NestedTranslationKey<'categories'>) =>
      getTranslation(language, 'categories', key),
    users: (key: NestedTranslationKey<'users'>) => getTranslation(language, 'users', key),
    settings: (key: NestedTranslationKey<'settings'>) => getTranslation(language, 'settings', key),
    inventory: (key: NestedTranslationKey<'inventory'>) =>
      getTranslation(language, 'inventory', key),
    reports: (key: NestedTranslationKey<'reports'>) => getTranslation(language, 'reports', key),
    layout: (key: NestedTranslationKey<'layout'>) => getTranslation(language, 'layout', key),
  }
}

export default createTranslate
