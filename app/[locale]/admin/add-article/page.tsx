import { Metadata } from 'next';
import AddArticleForm from '@/components/AddArticleForm';

export const metadata: Metadata = {
  title: 'Добавить статью | icoffio Admin',
  description: 'Панель добавления новых статей на сайт icoffio',
  robots: 'noindex,nofollow'
};

export default function AddArticlePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Добавить новую статью
            </h1>
            <p className="text-gray-600">
              Генерация и публикация статей на icoffio.com
            </p>
          </div>
          
          <AddArticleForm />
        </div>
      </div>
    </div>
  );
}

