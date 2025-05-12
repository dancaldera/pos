import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n';

interface PageLanguageSelectorProps {
  className?: string;
}

/**
 * A light themed version of the language selector for use on content pages
 */
const PageLanguageSelector: React.FC<PageLanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage, translate } = useLanguage();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <label htmlFor="page-language-selector" className="mr-2 text-sm text-gray-700">
        {translate.settings('language')}:
      </label>
      <select
        id="page-language-selector"
        value={language}
        onChange={handleLanguageChange}
        className="bg-white text-gray-800 text-sm rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
      >
        <option value="en">{translate.settings('english')}</option>
        <option value="es">{translate.settings('spanish')}</option>
      </select>
    </div>
  );
};

export default PageLanguageSelector;