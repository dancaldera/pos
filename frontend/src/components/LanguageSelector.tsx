import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n';

interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage, translate } = useLanguage();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <label htmlFor="language-selector" className="mr-2 text-sm text-gray-300">
        {translate.settings('language')}:
      </label>
      <select
        id="language-selector"
        value={language}
        onChange={handleLanguageChange}
        className="bg-gray-700 text-white text-sm rounded-md border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
      >
        <option value="en">{translate.settings('english')}</option>
        <option value="es">{translate.settings('spanish')}</option>
      </select>
    </div>
  );
};

export default LanguageSelector;