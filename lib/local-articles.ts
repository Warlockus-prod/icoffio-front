import type { Post, Category } from "./types";

// Локальные статьи для добавления на сайт
export const localArticles: Post[] = [
  {
    slug: "chto-nuzhno-znat-esli-vy-reshili-vnedrit-llm",
    title: "Что нужно знать, если вы решили внедрить LLM",
    excerpt: "Подробное руководство по внедрению больших языковых моделей в ваш продукт. Стратегии, тактики и реальный опыт от эксперта Яндекса.",
    date: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    image: "/images/ai-llm-implementation.jpg",
    imageAlt: "Схема внедрения LLM в продукт",
    category: { name: "AI", slug: "ai" },
    images: [
      "/images/ai-llm-implementation.jpg",
      "/images/ai-strategy-planning.jpg", 
      "/images/ai-development-process.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/ai-llm-implementation.jpg" alt="Внедрение LLM в продукт" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">Вокруг LLM очень много мистификации. Многие считают, что только особенные люди после специального образования могут освоить таинство работы с большими языковыми моделями. Это не так. В этой статье разберем, как эффективно внедрить LLM в ваш продукт.</p>

  <h2>Куда и зачем внедрять LLM?</h2>
  
  <p>ИИ успешно существовал и до появления LLM. Сферы, где классический ИИ приносит много пользы:</p>
  <ul>
    <li>Поиск и ранжирование результатов</li>
    <li>Рекомендательные системы в e-commerce</li>
    <li>Рекомендации контента в социальных сетях</li>
    <li>Таргетированная реклама</li>
  </ul>

  <p>Здесь работают классические модели: градиентный бустинг, коллаборативная фильтрация, факторизационные машины. LLM отличаются принципиально:</p>

  <h3>Ключевые отличия LLM</h3>
  
  <div class="bg-blue-50 p-6 rounded-lg mb-8">
    <h4>1. Взаимодействие через текст</h4>
    <p>LLM обучается через задачу предсказания следующего слова. Благодаря этому с моделью можно "поговорить" — ввести промпт и получить текстовый ответ.</p>
  </div>

  <div class="bg-green-50 p-6 rounded-lg mb-8">
    <h4>2. Обобщаемость</h4>
    <p>До LLM под каждую задачу нужно было создавать отдельную модель. LLM можно настроить текстом, объяснив что требуется.</p>
  </div>

  <img src="/images/ai-strategy-planning.jpg" alt="Планирование стратегии ИИ" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Стратегия внедрения</h2>

  <p>Исследования показывают, что 80% всех ИИ проектов проваливаются. Чтобы этого избежать, нужна правильная стратегия:</p>

  <h3>1. Определение целей и задач</h3>
  <p>Четко сформулируйте, какие конкретные задачи должна решать LLM в вашем продукте. Избегайте размытых формулировок типа "улучшить пользовательский опыт".</p>

  <h3>2. Выбор подходящей модели</h3>
  <p>Решите, использовать ли готовую модель (OpenAI, Claude, Gemini) или обучать собственную. В большинстве случаев готовые решения предпочтительнее.</p>

  <h3>3. Планирование интеграции</h3>
  <p>Продумайте архитектуру системы, API endpoints, обработку ошибок и масштабирование нагрузки.</p>

  <h2>Тактика реализации</h2>

  <p>У вас есть всего 3 основных инструмента для улучшения работы LLM:</p>

  <h3>Промпт-инжиниринг</h3>
  <p>Искусство составления правильных запросов к модели. Это самый быстрый и дешевый способ получить нужный результат.</p>

  <div class="bg-yellow-50 p-6 rounded-lg mb-6">
    <h4>Принципы хорошего промпта:</h4>
    <ul>
      <li>Четкие инструкции с конкретными примерами</li>
      <li>Определение роли и контекста</li>
      <li>Структурированный формат ответа</li>
      <li>Ограничения и условия выполнения</li>
    </ul>
  </div>

  <h3>RAG (Retrieval-Augmented Generation)</h3>
  <p>Технология дополнения запроса релевантной информацией из внешних источников. Позволяет модели использовать актуальные данные, которых не было в обучающей выборке.</p>

  <img src="/images/ai-development-process.jpg" alt="Процесс разработки ИИ" class="w-full h-64 object-cover rounded-lg my-8" />

  <h3>Дообучение (Fine-tuning)</h3>
  <p>Самый дорогой метод. Рекомендуется только в 5% случаев, когда промптинг и RAG не дают нужного результата.</p>

  <h2>Контроль качества</h2>

  <p>LLM могут галлюцинировать — выдавать правдоподобную, но неточную информацию. Обязательные меры:</p>

  <ul>
    <li>Автоматическое тестирование на наборе эталонных случаев</li>
    <li>A/B тестирование разных версий промптов</li>
    <li>Мониторинг качества ответов в продакшене</li>
    <li>Feedback loops для постоянного улучшения</li>
  </ul>

  <h2>Практические советы</h2>

  <div class="bg-red-50 p-6 rounded-lg mb-6">
    <h3>❌ Чего НЕ стоит делать:</h3>
    <ul>
      <li>Начинать с дообучения модели</li>
      <li>Игнорировать вопросы безопасности</li>
      <li>Недооценивать важность качественных данных</li>
      <li>Забывать про пользовательский опыт</li>
    </ul>
  </div>

  <div class="bg-green-50 p-6 rounded-lg mb-6">
    <h3>✅ Что СТОИТ делать:</h3>
    <ul>
      <li>Начинать с простых задач</li>
      <li>Быстро итерироваться и тестировать</li>
      <li>Инвестировать в инфраструктуру мониторинга</li>
      <li>Обучать команду работе с LLM</li>
    </ul>
  </div>

  <h2>Заключение</h2>

  <p>Внедрение LLM — это не магия, а инженерная задача со своими принципами и лучшими практиками. Главное — начинать с малого, тщательно тестировать и постоянно улучшать систему на основе реальной обратной связи.</p>

  <p>LLM значительно удешевляют доступ к ИИ технологиям. Раньше нужно было создавать модели с нуля, теперь можно взять готовое решение и адаптировать под свои задачи.</p>

  <blockquote class="text-xl italic border-l-4 border-blue-500 pl-6 my-8">
    "В мире неопределенности LLM проектов ключ к успеху — быстрая итерация, тщательное тестирование и постоянное обучение."
  </blockquote>

  <p><em>По материалам статьи Всеволода Викулина, руководителя внедрения LLM в Поиске Яндекса</em></p>
</div>
    `
  },

  {
    slug: "microsoft-ne-hochet-delat-igry-sama-i-drugim-ne-dayot",
    title: "Microsoft не хочет делать игры сама и другим не даёт",
    excerpt: "Анализ стратегии Microsoft в игровой индустрии после отказа от Perfect Dark и проблем с независимыми студиями.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    image: "/images/microsoft-gaming-strategy.jpg",
    imageAlt: "Microsoft Xbox и игровая стратегия",
    category: { name: "Tech", slug: "tech" },
    images: [
      "/images/microsoft-gaming-strategy.jpg",
      "/images/perfect-dark-xbox.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/microsoft-gaming-strategy.jpg" alt="Стратегия Microsoft в играх" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">Microsoft приостановила разработку игры Perfect Dark студией The Initiative и, по сути, передала проект Crystal Dynamics. Этот случай ярко демонстрирует текущие проблемы игрового подразделения компании.</p>

  <h2>Проблемы с собственной разработкой</h2>
  
  <p>The Initiative была создана как "студия мечты" для разработки AAA-проектов. Однако реальность оказалась сложнее:</p>
  <ul>
    <li>Высокая текучка кадров</li>
    <li>Проблемы с менеджментом проектов</li>
    <li>Отсутствие четкого видения продукта</li>
    <li>Конфликты между креативным и бизнес-подходами</li>
  </ul>

  <img src="/images/perfect-dark-xbox.jpg" alt="Perfect Dark на Xbox" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Влияние на независимые студии</h2>
  
  <p>Одновременно Microsoft усложняет жизнь независимым разработчикам:</p>
  <ul>
    <li>Жёсткие требования к эксклюзивности в Game Pass</li>
    <li>Сложная система сертификации</li>
    <li>Непредсказуемые изменения в политике</li>
    <li>Давление на студии через финансовые механизмы</li>
  </ul>

  <h2>Стратегические выводы</h2>
  
  <p>Microsoft фокусируется на платформенных решениях, а не на создании контента. Компания предпочитает покупать готовые студии или заключать партнёрские соглашения, чем развивать собственные команды разработки.</p>

  <div class="bg-red-50 p-6 rounded-lg">
    <h4>⚠️ Риски для индустрии</h4>
    <p>Такой подход может привести к снижению разнообразия игр и концентрации власти у крупных издателей.</p>
  </div>
</div>
    `
  },

  {
    slug: "huawei-predstavila-mate-xts-minornoe-obnovlenie",
    title: "HUAWEI представила Mate XTS: минорное обновление единственной трикладушки в мире",
    excerpt: "Обзор нового складного смартфона HUAWEI Mate XTS с тройным экраном - уникального устройства на рынке мобильных технологий.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    image: "/images/huawei-mate-xts.jpg",
    imageAlt: "HUAWEI Mate XTS трикладной смартфон",
    category: { name: "Tech", slug: "tech" },
    images: [
      "/images/huawei-mate-xts.jpg",
      "/images/huawei-foldable-tech.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/huawei-mate-xts.jpg" alt="HUAWEI Mate XTS" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">HUAWEI анонсировала Mate XTS — обновлённую версию единственного в мире трикладного смартфона. Несмотря на минорные улучшения, устройство остаётся технологическим прорывом.</p>

  <h2>Что нового в Mate XTS</h2>
  
  <div class="bg-blue-50 p-6 rounded-lg mb-8">
    <h4>🔧 Технические характеристики:</h4>
    <ul>
      <li>Процессор: Kirin 9000s (улучшенная версия)</li>
      <li>RAM: 16 ГБ (против 12 ГБ в предыдущей версии)</li>
      <li>Накопитель: до 1 ТБ</li>
      <li>Батарея: 5200 мАч с поддержкой 88W зарядки</li>
    </ul>
  </div>

  <h2>Инновационный дизайн</h2>
  
  <p>Mate XTS сохраняет уникальную конструкцию с тремя панелями:</p>
  <ul>
    <li>Основной экран: 7.85 дюйма в развёрнутом виде</li>
    <li>Внешний экран: 6.4 дюйма</li>
    <li>Дополнительная панель: 3.2 дюйма для быстрого доступа</li>
  </ul>

  <img src="/images/huawei-foldable-tech.jpg" alt="Технологии складных смартфонов" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Программное обеспечение</h2>
  
  <p>Устройство работает на HarmonyOS 4.2 с новыми функциями:</p>
  <ul>
    <li>Адаптивный интерфейс для трёх экранов</li>
    <li>Улучшенная многозадачность</li>
    <li>Оптимизация для китайских сервисов</li>
  </ul>

  <h2>Рыночное позиционирование</h2>
  
  <p>Mate XTS остаётся нишевым продуктом из-за высокой цены и ограниченной доступности. Однако он демонстрирует технологические возможности HUAWEI в сфере инноваций.</p>

  <div class="bg-green-50 p-6 rounded-lg">
    <h4>🎯 Целевая аудитория</h4>
    <p>Устройство ориентировано на технологических энтузиастов и бизнес-пользователей, которым нужна максимальная функциональность.</p>
  </div>
</div>
    `
  },

  {
    slug: "shok-analitiki-nazvali-czenu-na-iphone-17-air",
    title: "Шок: аналитики назвали цену на iPhone 17 Air",
    excerpt: "Инсайдерская информация о ценообразовании самого тонкого iPhone в истории Apple и его влиянии на рынок премиальных смартфонов.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    image: "/images/iphone-17-air-price.jpg",
    imageAlt: "iPhone 17 Air концепт и цена",
    category: { name: "Apple", slug: "apple" },
    images: [
      "/images/iphone-17-air-price.jpg",
      "/images/iphone-17-air-design.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/iphone-17-air-price.jpg" alt="iPhone 17 Air цена" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">Аналитики Ming-Chi Kuo и Jeff Pu предоставили шокирующие данные о стоимости будущего iPhone 17 Air — самого тонкого смартфона в истории Apple.</p>

  <h2>Прогнозируемая цена</h2>
  
  <div class="bg-red-50 p-6 rounded-lg mb-8">
    <h4>💰 Ценовая политика iPhone 17 Air:</h4>
    <ul>
      <li>128 ГБ: $899 (против $799 у iPhone 16)</li>
      <li>256 ГБ: $999</li>
      <li>512 ГБ: $1,199</li>
    </ul>
  </div>

  <h2>Причины повышения цены</h2>
  
  <p>Увеличение стоимости обусловлено несколькими факторами:</p>
  <ul>
    <li>Новая сверхтонкая конструкция (толщина менее 6 мм)</li>
    <li>Инновационные материалы для корпуса</li>
    <li>Усовершенствованная система охлаждения</li>
    <li>Новый дизайн модуля камер</li>
  </ul>

  <img src="/images/iphone-17-air-design.jpg" alt="Дизайн iPhone 17 Air" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Конкуренция на рынке</h2>
  
  <p>Высокая цена iPhone 17 Air может стать преимуществом для конкурентов:</p>
  <ul>
    <li>Samsung Galaxy S25 Ultra с более низкой ценой</li>
    <li>Google Pixel 9 Pro как альтернатива</li>
    <li>Китайские флагманы с агрессивной ценовой политикой</li>
  </ul>

  <h2>Рыночные прогнозы</h2>
  
  <p>Несмотря на высокую цену, аналитики ожидают хороших продаж благодаря:</p>
  <ul>
    <li>Уникальности дизайна</li>
    <li>Лояльности к бренду Apple</li>
    <li>Инновационным технологиям</li>
  </ul>

  <div class="bg-blue-50 p-6 rounded-lg">
    <h4>📊 Прогноз продаж</h4>
    <p>Ожидается 15-20 миллионов проданных устройств в первый год, что меньше чем у стандартных моделей, но достаточно для нишевого продукта.</p>
  </div>
</div>
    `
  },

  {
    slug: "utechka-iphone-17-pro-i-pro-max-budut-holodnee",
    title: "Утечка: iPhone 17 Pro и Pro Max будут холоднее, а их экраны ярче",
    excerpt: "Эксклюзивная информация об улучшениях в iPhone 17 Pro линейке: новая система охлаждения и революционные экраны ProMotion 2.0.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    image: "/images/iphone-17-pro-cooling.jpg",
    imageAlt: "iPhone 17 Pro система охлаждения",
    category: { name: "Apple", slug: "apple" },
    images: [
      "/images/iphone-17-pro-cooling.jpg",
      "/images/iphone-17-pro-display.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/iphone-17-pro-cooling.jpg" alt="iPhone 17 Pro охлаждение" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">Инсайдеры из цепочки поставок Apple раскрыли детали об iPhone 17 Pro и Pro Max. Новые модели получат революционную систему охлаждения и значительно улучшенные дисплеи.</p>

  <h2>Новая система охлаждения</h2>
  
  <div class="bg-blue-50 p-6 rounded-lg mb-8">
    <h4>🧊 Технологические улучшения:</h4>
    <ul>
      <li>Графеновый слой между процессором и корпусом</li>
      <li>Улучшенная паровая камера (на 40% эффективнее)</li>
      <li>Новый термоинтерфейс на основе жидкого металла</li>
      <li>Оптимизированные воздушные каналы в корпусе</li>
    </ul>
  </div>

  <h2>Революция в дисплеях</h2>
  
  <p>iPhone 17 Pro получит экраны нового поколения ProMotion 2.0:</p>
  <ul>
    <li>Пиковая яркость: 2000 нит (против 1600 у iPhone 16 Pro)</li>
    <li>Улучшенная цветопередача с поддержкой Rec. 2020</li>
    <li>Адаптивная частота обновления до 144 Гц</li>
    <li>Энергоэффективность на 25% лучше</li>
  </ul>

  <img src="/images/iphone-17-pro-display.jpg" alt="Дисплей iPhone 17 Pro" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Влияние на производительность</h2>
  
  <p>Улучшенное охлаждение позволит A19 Pro работать на максимальной частоте дольше:</p>
  <ul>
    <li>На 15% лучше производительность в играх</li>
    <li>Стабильная работа при интенсивных AI-задачах</li>
    <li>Меньший троттлинг при съёмке видео в 4K</li>
  </ul>

  <h2>Сроки анонса</h2>
  
  <p>Согласно источникам, официальный анонс запланирован на сентябрь 2025 года с началом продаж в октябре.</p>

  <div class="bg-green-50 p-6 rounded-lg">
    <h4>🎯 Конкурентные преимущества</h4>
    <p>Новые технологии помогут iPhone 17 Pro конкурировать с флагманами Android, особенно в сфере мобильного гейминга и профессиональной фотографии.</p>
  </div>
</div>
    `
  },

  {
    slug: "wycieki-dji-mini-5-pro-szokuja-swiat-dronow-pl",
    title: "Wycieki DJI Mini 5 Pro szokują świat dronów: 52-minutowy czas lotu i 1-calowa kamera",
    excerpt: "Ekskluzywne informacje o nadchodzącym DJI Mini 5 Pro - rewolucyjnym dronie z rekordowym czasem lotu i profesjonalną jakością obrazu.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    image: "/images/dji-mini-5-pro-drone.jpg",
    imageAlt: "DJI Mini 5 Pro nowy dron",
    category: { name: "Tech", slug: "tech" },
    images: [
      "/images/dji-mini-5-pro-drone.jpg",
      "/images/dji-mini-5-pro-camera.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/dji-mini-5-pro-drone.jpg" alt="DJI Mini 5 Pro" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">Przecieki z fabryk DJI ujawniają spektakularne specyfikacje nadchodzącego Mini 5 Pro. Nowy dron może zrewolucjonizować segment konsumencki dzięki rekordowemu czasowi lotu i profesjonalnej kamerze.</p>

  <h2>Rekordowy czas lotu</h2>
  
  <div class="bg-green-50 p-6 rounded-lg mb-8">
    <h4>⏱️ Parametry baterii:</h4>
    <ul>
      <li>Maksymalny czas lotu: 52 minuty</li>
      <li>Pojemność baterii: 3850 mAh</li>
      <li>Inteligentne zarządzanie energią</li>
      <li>Tryb eco do 60 minut lotu</li>
    </ul>
  </div>

  <h2>Profesjonalna kamera</h2>
  
  <p>Największą nowością jest 1-calowy sensor CMOS:</p>
  <ul>
    <li>Rozdzielczość: 24MP dla zdjęć</li>
    <li>Video: 4K w 60fps z 10-bitowym kodowaniem</li>
    <li>Apertura: f/1.7 z optyczną stabilizacją</li>
    <li>Zoom cyfrowy: 4x bez utraty jakości</li>
  </ul>

  <img src="/images/dji-mini-5-pro-camera.jpg" alt="Kamera DJI Mini 5 Pro" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Inteligentne funkcje</h2>
  
  <p>Mini 5 Pro otrzyma zaawansowane funkcje AI:</p>
  <ul>
    <li>ActiveTrack 6.0 z lepszym rozpoznawaniem obiektów</li>
    <li>Automatyczne unikanie przeszkód w 360°</li>
    <li>Inteligentne tryby fotograficzne</li>
    <li>Rozpoznawanie gestów na odległość do 50 metrów</li>
  </ul>

  <h2>Cena i dostępność</h2>
  
  <p>Według źródeł, DJI Mini 5 Pro będzie kosztować około:</p>
  <ul>
    <li>Podstawowa wersja: $899</li>
    <li>Fly More Combo: $1,199</li>
    <li>Wersja z DJI RC Pro: $1,399</li>
  </ul>

  <div class="bg-yellow-50 p-6 rounded-lg">
    <h4>📅 Timeline</h4>
    <p>Oficjalny anons spodziewany jest w Q2 2025, a pierwsze dostawy rozpoczną się latem.</p>
  </div>
</div>
    `
  },

  {
    slug: "studia-mba-nauczyly-go-zadawania-wlasciwych-pytan-pl",
    title: "Studia MBA nauczyły go zadawania właściwych pytań - to bezcenna umiejętność u menedżera",
    excerpt: "Historia sukcesu absolwenta MBA o tym, jak umiejętność zadawania właściwych pytań zmieniła jego karierę i sposób zarządzania zespołem.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
    image: "/images/mba-leadership-skills.jpg",
    imageAlt: "MBA i umiejętności przywódcze",
    category: { name: "News", slug: "news-2" },
    images: [
      "/images/mba-leadership-skills.jpg",
      "/images/mba-strategic-thinking.jpg"
    ],
    contentHtml: `
<div class="prose prose-lg max-w-none">
  <img src="/images/mba-leadership-skills.jpg" alt="Umiejętności MBA" class="w-full h-64 object-cover rounded-lg mb-8" />
  
  <p class="lead">Tomasz Kowalski, absolwent MBA z Warszawskiej Szkoły Biznesu, dzieli się swoimi doświadczeniami o tym, jak studia zmieniły jego podejście do zarządzania i podejmowania decyzji biznesowych.</p>

  <h2>Sztuka zadawania pytań</h2>
  
  <p>Podczas studiów MBA Tomasz nauczył się, że najważniejszą umiejętnością lidera nie jest znajomość odpowiedzi, ale umiejętność zadawania właściwych pytań:</p>
  <ul>
    <li>"Jakie są prawdziwe potrzeby naszych klientów?"</li>
    <li>"Co by się stało, gdybyśmy nie zrealizowali tego projektu?"</li>
    <li>"Jakie założenia leżą u podstaw naszej strategii?"</li>
    <li>"Kto będzie najbardziej dotknięty tą decyzją?"</li>
  </ul>

  <img src="/images/mba-strategic-thinking.jpg" alt="Strategiczne myślenie MBA" class="w-full h-64 object-cover rounded-lg my-8" />

  <h2>Praktyczne zastosowanie</h2>
  
  <div class="bg-blue-50 p-6 rounded-lg mb-8">
    <h4>💡 Przykład z praktyki:</h4>
    <p>Zamiast pytać "Jak zwiększyć sprzedaż?", Tomasz pyta: "Dlaczego klienci wybierają konkurencję?" To prowadzi do głębszych wniosków i lepszych rozwiązań.</p>
  </div>

  <h2>Wpływ na zespół</h2>
  
  <p>Zmiana podejścia wpłynęła na całą organizację:</p>
  <ul>
    <li>Pracownicy czują się bardziej zaangażowani</li>
    <li>Decyzje są lepiej przemyślane</li>
    <li>Zmniejszyła się liczba błędnych strategii</li>
    <li>Poprawiła się komunikacja między działami</li>
  </ul>

  <h2>Konkretne techniki</h2>
  
  <p>Tomasz dzieli się konkretnymi metodami:</p>
  <ul>
    <li><strong>5 Why</strong> - pytanie "dlaczego?" pięć razy z rzędu</li>
    <li><strong>Devil's Advocate</strong> - celowe kwestionowanie założeń</li>
    <li><strong>What if?</strong> - analiza scenariuszy alternatywnych</li>
  </ul>

  <div class="bg-green-50 p-6 rounded-lg">
    <h4>🎯 Kluczowa lekcja</h4>
    <p>"Menedżer, który zadaje właściwe pytania, jest ważniejszy niż ten, który zna wszystkie odpowiedzi" - podsumowuje Tomasz.</p>
  </div>
</div>
    `
  },

  // Английские переводы
  {
    slug: "what-you-need-to-know-if-you-decide-to-implement-llm-en",
    title: "What You Need to Know if You Decide to Implement LLM",
    excerpt: "Comprehensive guide to implementing large language models in your product. Strategies, tactics, and real experience from a Yandex expert.",
    date: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    image: "/images/ai-llm-implementation.jpg",
    imageAlt: "LLM implementation scheme in product",
    category: { name: "AI", slug: "ai" },
    images: ["/images/ai-llm-implementation.jpg", "/images/ai-strategy-planning.jpg"],
    contentHtml: `<div class="prose prose-lg max-w-none">
      <img src="/images/ai-llm-implementation.jpg" alt="LLM implementation" class="w-full h-64 object-cover rounded-lg mb-8" />
      <p class="lead">There's a lot of mystification around LLMs. Many believe only special people can master large language models. This isn't true. Let's explore how to effectively implement LLM in your product.</p>
      <h2>Implementation Strategy</h2>
      <p>Start with narrow, clearly formulated tasks. Use ready APIs like OpenAI, Anthropic, or Replicate. Develop iteratively.</p>
      <img src="/images/ai-strategy-planning.jpg" alt="AI strategy" class="w-full h-64 object-cover rounded-lg my-8" />
      <p>Remember: LLM is a powerful tool, but not magic. Success depends on proper application and iterative improvement.</p>
    </div>`
  },

  {
    slug: "microsoft-doesnt-want-to-make-games-itself-en",
    title: "Microsoft doesn't want to make games itself and doesn't let others",
    excerpt: "Analysis of Microsoft's strategy in gaming industry after abandoning Perfect Dark and problems with independent studios.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    image: "/images/microsoft-gaming-strategy.jpg",
    imageAlt: "Microsoft Xbox gaming strategy",
    category: { name: "Tech", slug: "tech" },
    images: ["/images/microsoft-gaming-strategy.jpg", "/images/perfect-dark-xbox.jpg"],
    contentHtml: `<div class="prose prose-lg max-w-none">
      <img src="/images/microsoft-gaming-strategy.jpg" alt="Microsoft gaming" class="w-full h-64 object-cover rounded-lg mb-8" />
      <p class="lead">Microsoft paused Perfect Dark development by The Initiative and handed project to Crystal Dynamics. This demonstrates current problems of the gaming division.</p>
      <h2>Internal Development Problems</h2>
      <p>The Initiative was created as "dream studio" but faced: high staff turnover, project management issues, lack of clear vision, creative conflicts.</p>
      <img src="/images/perfect-dark-xbox.jpg" alt="Perfect Dark Xbox" class="w-full h-64 object-cover rounded-lg my-8" />
      <p>Microsoft focuses on platform solutions rather than content creation, preferring to buy studios than develop internal teams.</p>
    </div>`
  }
];

// Временное хранилище для статей, добавленных через API
const runtimeArticles: Post[] = [];

// Функция для получения всех локальных статей
export async function getLocalArticles(): Promise<Post[]> {
  return [...localArticles, ...runtimeArticles];
}

// Функция для получения локальной статьи по slug
export async function getLocalArticleBySlug(slug: string): Promise<Post | null> {
  const allArticles = [...localArticles, ...runtimeArticles];
  return allArticles.find(article => article.slug === slug) || null;
}

// Функция для добавления новой статьи
export function addLocalArticle(article: Post): void {
  runtimeArticles.push(article);
}