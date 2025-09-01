'use client'

import { Container } from '@/components/Container';
import { MassTranslation } from '@/components/MassTranslation';

export default function AdminTranslatePage() {
  // Защита от доступа в продакшене
  if (process.env.NODE_ENV === 'production') {
    return (
      <Container>
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold text-red-600">🚫 Доступ запрещен</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Админ панель доступна только в режиме разработки
          </p>
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Для массового перевода используйте:
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <div>🔧 WordPress: icoffio.com/wp-admin</div>
              <div>⚡ Панель: app.icoffio.com/en/admin</div>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-12">
        <MassTranslation />
      </div>
    </Container>
  );
}
