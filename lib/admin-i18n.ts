/**
 * ADMIN PANEL LOCALIZATION
 * 
 * Локализация для админ-панели (EN + PL)
 * 
 * @version 1.0.0
 * @date 2025-11-03
 */

export type AdminLocale = 'en' | 'pl';

export const adminTranslations = {
  en: {
    // Content Prompts
    contentPrompts: {
      title: 'Content Prompts Management',
      description: 'Configure text processing styles for articles and Telegram bot',
      journalistic: 'Journalistic Style',
      journalisticDesc: 'Rewrite text in journalistic style for wide audience',
      asIs: 'Keep As Is',
      asIsDesc: 'Do not change text, use as is',
      seoOptimized: 'SEO Optimized',
      seoOptimizedDesc: 'Optimize text for search engines',
      academic: 'Academic Style',
      academicDesc: 'Rewrite in academic/scientific style',
      casual: 'Casual Style',
      casualDesc: 'Friendly and conversational tone',
      technical: 'Technical Style',
      technicalDesc: 'Precise technical documentation',
      custom: 'Custom Prompt',
      customDesc: 'Use your own custom prompt'
    },
    
    // Advertising
    advertising: {
      title: 'Advertising Management',
      description: 'Manage ad placements and priorities',
      changesSaved: 'Changes saved',
      adEnabled: 'Ad enabled',
      adDisabled: 'Ad disabled',
      priorityUpdated: 'Priority updated',
      adDeleted: 'Ad placement deleted',
      configReset: 'Configuration reset to defaults',
      configExported: 'Configuration exported',
      configImported: 'Configuration imported',
      desktop: 'Desktop',
      mobile: 'Mobile',
      both: 'Both',
      enabled: 'Enabled',
      disabled: 'Disabled',
      priority: 'Priority',
      device: 'Device',
      format: 'Format',
      placeId: 'Place ID',
      status: 'Status',
      actions: 'Actions',
      toggleAd: 'Toggle Ad',
      editAd: 'Edit Ad',
      deleteAd: 'Delete Ad',
      addNewPlacement: 'Add New Placement',
      resetToDefaults: 'Reset to Defaults',
      exportConfig: 'Export Config',
      importConfig: 'Import Config'
    },
    
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      edit: 'Edit',
      delete: 'Delete',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      success: 'Success',
      error: 'Error',
      loading: 'Loading',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No'
    }
  },
  
  pl: {
    // Content Prompts
    contentPrompts: {
      title: 'Zarządzanie promptami treści',
      description: 'Skonfiguruj style przetwarzania tekstu dla artykułów i bota Telegram',
      journalistic: 'Styl dziennikarski',
      journalisticDesc: 'Przepisz tekst w stylu dziennikarskim dla szerokiej publiczności',
      asIs: 'Zostaw jak jest',
      asIsDesc: 'Nie zmieniaj tekstu, użyj jak jest',
      seoOptimized: 'Zoptymalizowane SEO',
      seoOptimizedDesc: 'Optymalizuj tekst dla wyszukiwarek',
      academic: 'Styl akademicki',
      academicDesc: 'Przepisz w stylu akademickim/naukowym',
      casual: 'Styl swobodny',
      casualDesc: 'Przyjazny i konwersacyjny ton',
      technical: 'Styl techniczny',
      technicalDesc: 'Precyzyjna dokumentacja techniczna',
      custom: 'Własny prompt',
      customDesc: 'Użyj własnego promptu'
    },
    
    // Advertising
    advertising: {
      title: 'Zarządzanie reklamami',
      description: 'Zarządzaj miejscami reklamowymi i priorytetami',
      changesSaved: 'Zmiany zapisane',
      adEnabled: 'Reklama włączona',
      adDisabled: 'Reklama wyłączona',
      priorityUpdated: 'Priorytet zaktualizowany',
      adDeleted: 'Miejsce reklamowe usunięte',
      configReset: 'Konfiguracja przywrócona do domyślnej',
      configExported: 'Konfiguracja wyeksportowana',
      configImported: 'Konfiguracja zaimportowana',
      desktop: 'Komputer',
      mobile: 'Mobilne',
      both: 'Oba',
      enabled: 'Włączone',
      disabled: 'Wyłączone',
      priority: 'Priorytet',
      device: 'Urządzenie',
      format: 'Format',
      placeId: 'ID miejsca',
      status: 'Status',
      actions: 'Akcje',
      toggleAd: 'Przełącz reklamę',
      editAd: 'Edytuj reklamę',
      deleteAd: 'Usuń reklamę',
      addNewPlacement: 'Dodaj nowe miejsce',
      resetToDefaults: 'Przywróć domyślne',
      exportConfig: 'Eksportuj konfigurację',
      importConfig: 'Importuj konfigurację'
    },
    
    // Common
    common: {
      save: 'Zapisz',
      cancel: 'Anuluj',
      close: 'Zamknij',
      edit: 'Edytuj',
      delete: 'Usuń',
      add: 'Dodaj',
      search: 'Szukaj',
      filter: 'Filtruj',
      all: 'Wszystkie',
      success: 'Sukces',
      error: 'Błąd',
      loading: 'Ładowanie',
      confirm: 'Potwierdź',
      yes: 'Tak',
      no: 'Nie'
    }
  }
};

/**
 * Получить перевод для админ-панели
 */
export function getAdminTranslation(locale: AdminLocale = 'en') {
  return adminTranslations[locale];
}

/**
 * Hook для использования админ локализации
 */
export function useAdminLocale() {
  // По умолчанию English, но можно расширить для выбора языка
  const locale: AdminLocale = 'en';
  
  return {
    locale,
    t: adminTranslations[locale]
  };
}

