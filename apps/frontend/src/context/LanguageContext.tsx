import type React from 'react'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import createTranslate, { type Language } from '../i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  translate: ReturnType<typeof createTranslate>
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Create a provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize language from localStorage or default to 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language')
    return (savedLanguage as Language) || 'en'
  })

  // Create the translate functions
  const translate = createTranslate(language)

  // Update localStorage when language changes
  const setLanguage = (newLanguage: Language) => {
    localStorage.setItem('language', newLanguage)
    setLanguageState(newLanguage)

    // Optional: Set HTML lang attribute for better accessibility
    document.documentElement.lang = newLanguage
  }

  // Set language attribute on first render
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Context value
  const value = {
    language,
    setLanguage,
    translate,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// Custom hook for using the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default LanguageContext
