'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

/**
 * Toast Notifications Component
 * 
 * Использует react-hot-toast для красивых уведомлений
 * Интегрируется в AdminLayout для всей админ-панели
 * 
 * Типы уведомлений:
 * - Success ✅ - успешные операции (зеленый)
 * - Error ❌ - ошибки API/операций (красный)
 * - Loading ⏳ - процесс выполнения (синий)
 * - Info ℹ️ - информационные сообщения (синий)
 */
export default function Toast() {
  return (
    <HotToaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options для всех toast
        className: '',
        duration: 4000,
        style: {
          background: '#fff',
          color: '#363636',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '14px',
          maxWidth: '500px',
        },
        
        // Success toast (зеленый)
        success: {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#10b981',
          },
        },
        
        // Error toast (красный)
        error: {
          duration: 5000,
          style: {
            background: '#ef4444',
            color: '#fff',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#ef4444',
          },
        },
        
        // Loading toast (синий)
        loading: {
          style: {
            background: '#3b82f6',
            color: '#fff',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#3b82f6',
          },
        },
        
        // Custom toast (можно настроить)
        custom: {
          duration: 4000,
        },
      }}
    />
  );
}

/**
 * Утилиты для использования toast в компонентах
 * 
 * Примеры использования:
 * 
 * import toast from 'react-hot-toast';
 * 
 * // Success
 * toast.success('✅ Article published successfully!');
 * 
 * // Error
 * toast.error('❌ Failed to save article');
 * 
 * // Loading
 * const toastId = toast.loading('⏳ Publishing article...');
 * // После завершения:
 * toast.success('✅ Published!', { id: toastId });
 * 
 * // Promise (автоматически показывает loading → success/error)
 * toast.promise(
 *   saveArticle(),
 *   {
 *     loading: '⏳ Saving...',
 *     success: '✅ Saved successfully!',
 *     error: '❌ Failed to save',
 *   }
 * );
 */





