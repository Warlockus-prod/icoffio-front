import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: `${t.editorial} | ${t.siteTitle}`,
    description: "Редакция icoffio - команда экспертов в области технологий",
    keywords: "редакция, команда, icoffio, технологии, журналисты",
  };
}

export default function EditorialPage({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale as any);
  
  const breadcrumbs = [
    { label: t.editorial, href: `/${params.locale}/editorial` }
  ];

  return (
    <Container>
      <Breadcrumbs items={breadcrumbs} locale={params.locale} />
      
      <div className="max-w-4xl mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {t.editorial}
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-300">
            Команда экспертов icoffio
          </p>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              О нашей редакции
            </h2>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              Редакция icoffio объединяет опытных журналистов, аналитиков и экспертов в области технологий. 
              Мы следим за последними трендами в мире высоких технологий, искусственного интеллекта, 
              мобильных устройств и digital-инноваций.
            </p>
            <p className="text-neutral-700 dark:text-neutral-300 mb-6">
              Наша миссия — предоставлять читателям актуальную, достоверную и полезную информацию 
              о технологических новинках, которые формируют наше будущее.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Наши принципы
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 dark:text-neutral-300">
              <li><strong>Достоверность:</strong> Мы проверяем каждый факт и источник информации</li>
              <li><strong>Актуальность:</strong> Освещаем самые свежие новости технологического мира</li>
              <li><strong>Экспертность:</strong> Привлекаем признанных специалистов для анализа</li>
              <li><strong>Доступность:</strong> Объясняем сложные технологии простым языком</li>
              <li><strong>Независимость:</strong> Высказываем объективные мнения и оценки</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Контакты редакции
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                <strong>Email:</strong> editorial@icoffio.com
              </p>
              <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                <strong>Предложения и сотрудничество:</strong> contact@icoffio.com
              </p>
              <p className="text-neutral-700 dark:text-neutral-300">
                <strong>Пресс-релизы:</strong> press@icoffio.com
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Присоединяйтесь к нам
            </h2>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              Если вы разделяете нашу страсть к технологиям и хотели бы присоединиться к команде, 
              отправляйте ваше резюме и портфолио на careers@icoffio.com
            </p>
            <p className="text-neutral-700 dark:text-neutral-300">
              Мы всегда открыты для талантливых авторов, редакторов и технических экспертов.
            </p>
          </section>
        </div>
      </div>
    </Container>
  );
}

