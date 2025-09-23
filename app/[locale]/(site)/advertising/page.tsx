import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: `${t.advertising} | ${t.siteTitle}`,
    description: "Размещение рекламы на icoffio - эффективный способ достичь технологической аудитории",
    keywords: "реклама, размещение, медиакит, icoffio, технологии, аудитория",
  };
}

export default function AdvertisingPage({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);
  
  const breadcrumbs = [
    { label: t.advertising, href: `/${params.locale}/advertising` }
  ];

  return (
    <Container>
      <Breadcrumbs items={breadcrumbs} locale={params.locale} />
      
      <div className="max-w-4xl mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {t.advertising}
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-300">
            Ваш путь к технологической аудитории
          </p>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Почему icoffio?
            </h2>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              icoffio — ведущее издание о технологиях, которое объединяет активную и платежеспособную аудиторию 
              IT-специалистов, технологических энтузиастов и лиц, принимающих решения в сфере высоких технологий.
            </p>
            <div className="grid md:grid-cols-3 gap-6 my-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">50K+</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Уникальных посетителей в месяц</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">75%</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">IT-специалисты и техноэнтузиасты</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">3.5min</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Среднее время на сайте</div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Рекламные форматы
            </h2>
            <div className="space-y-6">
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  🖼️ Медийная реклама
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                  Баннеры различных форматов для максимального охвата аудитории
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Баннер 728x90 (лидербор)</li>
                  <li>• Баннер 300x250 (прямоугольник)</li>
                  <li>• Баннер 300x600 (небоскреб)</li>
                  <li>• Баннер 970x250 (билборд)</li>
                </ul>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  📝 Нативная реклама
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                  Интегрированный контент, который органично вписывается в ленту новостей
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Спонсорские статьи</li>
                  <li>• Обзоры продуктов</li>
                  <li>• Кейс-стади</li>
                  <li>• Экспертные мнения</li>
                </ul>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  📧 Email-рассылка
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                  Прямое попадание в почтовые ящики подписчиков
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Еженедельная рассылка новостей</li>
                  <li>• Специальные дайджесты</li>
                  <li>• Анонсы мероприятий</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Наша аудитория
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-neutral-900 dark:text-neutral-100">
                  👨‍💼 Профессии
                </h3>
                <ul className="text-neutral-700 dark:text-neutral-300 space-y-1">
                  <li>• IT-директора и CTO</li>
                  <li>• Разработчики и программисты</li>
                  <li>• Системные администраторы</li>
                  <li>• Product и Project менеджеры</li>
                  <li>• Технологические консультанты</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3 text-neutral-900 dark:text-neutral-100">
                  📊 Интересы
                </h3>
                <ul className="text-neutral-700 dark:text-neutral-300 space-y-1">
                  <li>• Искусственный интеллект</li>
                  <li>• Облачные технологии</li>
                  <li>• Мобильные устройства</li>
                  <li>• Кибербезопасность</li>
                  <li>• Инновационные стартапы</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Стоимость размещения
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                Стоимость рекламных размещений зависит от выбранного формата, длительности кампании и сезонности. 
                Мы предлагаем гибкие условия и индивидуальный подход к каждому клиенту.
              </p>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <p className="mb-2">• Медийная реклама: от $50 за 1000 показов</p>
                <p className="mb-2">• Нативная реклама: от $500 за статью</p>
                <p>• Email-рассылка: от $200 за размещение</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Свяжитесь с нами
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                Готовы начать рекламную кампанию или хотите получить подробный медиакит? 
                Свяжитесь с нашим отделом продаж:
              </p>
              <div className="space-y-2">
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>📧 Email:</strong> advertising@icoffio.com
                </p>
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>📱 Telegram:</strong> @icoffio_ads
                </p>
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>🕐 Время работы:</strong> Пн-Пт, 9:00-18:00 (CET)
                </p>
              </div>
              <div className="mt-6">
                <a 
                  href="mailto:advertising@icoffio.com?subject=Запрос о размещении рекламы"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Отправить запрос
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
