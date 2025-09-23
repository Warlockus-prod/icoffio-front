import type { Post, Category } from "./types";

// Локальные статьи для тестирования и fallback
const localArticles: Post[] = [
  {
    slug: "ai-revolution-2024",
    title: "Революция ИИ в 2024 году: что нас ждет",
    excerpt: "Искусственный интеллект продолжает развиваться стремительными темпами. Разбираем главные тренды и прорывы этого года.",
    publishedAt: "2024-01-15T10:00:00Z",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    category: { name: "Искусственный интеллект", slug: "ai" },
    content: `
# Революция ИИ в 2024 году

Искусственный интеллект становится неотъемлемой частью нашей повседневной жизни. В 2024 году мы наблюдаем беспрецедентные достижения в области машинного обучения и нейронных сетей.

## Основные тренды

- Мультимодальные модели становятся стандартом
- Персонализированные ИИ-ассистенты
- Этические вопросы использования ИИ

## Прорывы года

Компании активно внедряют ИИ-решения в свои продукты, от автономного вождения до персонализированной медицины.
    `,
    contentHtml: `<h1>Революция ИИ в 2024 году</h1><p>Искусственный интеллект становится неотъемлемой частью нашей повседневной жизни...</p>`
  },
  {
    slug: "apple-vision-pro-review",
    title: "Apple Vision Pro: обзор революционного устройства",
    excerpt: "Детальный обзор первых смешанной реальности от Apple. Стоит ли покупать и что ждать в будущем?",
    publishedAt: "2024-01-10T14:30:00Z",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=400&fit=crop",
    category: { name: "Apple", slug: "apple" },
    content: `
# Apple Vision Pro: будущее уже здесь?

Apple Vision Pro представляет собой первую попытку Apple войти в рынок смешанной реальности. Это устройство обещает изменить наше представление о взаимодействии с цифровым миром.

## Характеристики

- Высокое разрешение дисплеев
- Интуитивное управление взглядом
- Интеграция с экосистемой Apple

## Впечатления

Устройство действительно впечатляет своими возможностями, но высокая цена делает его доступным не для всех.
    `,
    contentHtml: `<h1>Apple Vision Pro: будущее уже здесь?</h1><p>Apple Vision Pro представляет собой первую попытку Apple войти в рынок смешанной реальности...</p>`
  },
  {
    slug: "gaming-trends-2024",
    title: "Игровые тренды 2024: что изменится в индустрии",
    excerpt: "Облачный гейминг, VR-игры и ИИ-генерируемый контент - разбираем основные тенденции в игровой индустрии.",
    publishedAt: "2024-01-08T09:15:00Z",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=400&fit=crop",
    category: { name: "Игры", slug: "games" },
    content: `
# Игровые тренды 2024

Игровая индустрия продолжает развиваться, предлагая игрокам новые форматы и технологии. В этом году особенно выделяются несколько ключевых направлений.

## Основные тренды

- Облачный гейминг становится мейнстримом
- VR и AR игры набирают популярность  
- ИИ помогает создавать игровой контент

## Будущее гейминга

Технологии развиваются так быстро, что через несколько лет игры могут стать неузнаваемыми.
    `,
    contentHtml: `<h1>Игровые тренды 2024</h1><p>Игровая индустрия продолжает развиваться...</p>`
  },
  {
    slug: "tech-innovations-2024",
    title: "Технологические инновации 2024: обзор прорывов",
    excerpt: "От квантовых компьютеров до биотехнологий - рассматриваем самые значимые технологические достижения года.",
    publishedAt: "2024-01-05T16:45:00Z",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop",
    category: { name: "Технологии", slug: "tech" },
    content: `
# Технологические прорывы 2024

Этот год стал особенно богатым на технологические инновации. Мы наблюдаем прогресс в самых разных областях - от компьютерных технологий до биомедицины.

## Ключевые области

- Квантовые вычисления выходят на новый уровень
- Биотехнологии и персонализированная медицина
- Устойчивые технологии и зеленая энергетика

## Влияние на общество

Эти инновации уже начинают менять нашу жизнь к лучшему.
    `,
    contentHtml: `<h1>Технологические прорывы 2024</h1><p>Этот год стал особенно богатым на технологические инновации...</p>`
  },
  {
    slug: "digital-transformation-guide",
    title: "Гид по цифровой трансформации для бизнеса",
    excerpt: "Пошаговое руководство по внедрению цифровых технологий в бизнес-процессы компании.",
    publishedAt: "2024-01-03T11:20:00Z",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
    category: { name: "Digital", slug: "digital" },
    content: `
# Цифровая трансформация: с чего начать

Цифровая трансформация стала необходимостью для большинства компаний. Но как правильно подойти к этому процессу?

## Этапы трансформации

- Анализ текущего состояния
- Определение целей и стратегии
- Поэтапное внедрение решений

## Ключевые технологии

Облачные сервисы, автоматизация процессов и аналитика данных - основа успешной трансформации.
    `,
    contentHtml: `<h1>Цифровая трансформация: с чего начать</h1><p>Цифровая трансформация стала необходимостью для большинства компаний...</p>`
  },
  {
    slug: "tech-news-weekly-january",
    title: "Технологические новости недели: январь 2024",
    excerpt: "Самые важные технологические новости и анонсы за прошедшую неделю в мире высоких технологий.",
    publishedAt: "2024-01-01T08:00:00Z",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop",
    category: { name: "Новости", slug: "news-2" },
    content: `
# Технологические новости недели

Подборка самых интересных технологических новостей за прошедшую неделю.

## Главные события

- Новые анонсы от крупных tech-компаний
- Прорывы в области ИИ и машинного обучения
- Обновления популярных сервисов и платформ

## Что ждать дальше

В ближайшие недели ожидается еще больше интересных анонсов и релизов.
    `,
    contentHtml: `<h1>Технологические новости недели</h1><p>Подборка самых интересных технологических новостей...</p>`
  },

  // ========== АНГЛИЙСКИЕ ПЕРЕВОДЫ ==========
  {
    slug: "ai-revolution-2024-en",
    title: "AI Revolution 2024: What Awaits Us",
    excerpt: "Artificial intelligence continues to develop at a rapid pace. We analyze the main trends and breakthroughs of this year.",
    publishedAt: "2024-01-15T10:00:00Z",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    category: { name: "Artificial Intelligence", slug: "ai" },
    content: `
# AI Revolution 2024

Artificial intelligence is becoming an integral part of our daily lives. In 2024, we are witnessing unprecedented achievements in machine learning and neural networks.

## Main Trends

- Multimodal models becoming the standard
- Personalized AI assistants
- Ethical issues in AI usage

## Breakthroughs of the Year

Companies are actively implementing AI solutions in their products, from autonomous driving to personalized medicine.
    `,
    contentHtml: `<h1>AI Revolution 2024</h1><p>Artificial intelligence is becoming an integral part of our daily lives...</p>`
  },
  {
    slug: "apple-vision-pro-review-en",
    title: "Apple Vision Pro: Revolutionary Device Review",
    excerpt: "Detailed review of Apple's first mixed reality device. Is it worth buying and what to expect in the future?",
    publishedAt: "2024-01-10T14:30:00Z",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=400&fit=crop",
    category: { name: "Apple", slug: "apple" },
    content: `
# Apple Vision Pro: Is the Future Here?

Apple Vision Pro represents Apple's first attempt to enter the mixed reality market. This device promises to change our understanding of interaction with the digital world.

## Specifications

- High-resolution displays
- Intuitive eye-tracking control
- Integration with Apple ecosystem

## Impressions

The device truly impresses with its capabilities, but the high price makes it accessible not to everyone.
    `,
    contentHtml: `<h1>Apple Vision Pro: Is the Future Here?</h1><p>Apple Vision Pro represents Apple's first attempt...</p>`
  },
  {
    slug: "gaming-trends-2024-en",
    title: "Gaming Trends 2024: What Will Change in the Industry",
    excerpt: "Cloud gaming, VR games, and AI-generated content - analyzing the main trends in the gaming industry.",
    publishedAt: "2024-01-08T09:15:00Z",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=400&fit=crop",
    category: { name: "Games", slug: "games" },
    content: `
# Gaming Trends 2024

The gaming industry continues to evolve, offering players new formats and technologies. This year, several key directions stand out particularly.

## Main Trends

- Cloud gaming becoming mainstream
- VR and AR games gaining popularity  
- AI helping create gaming content

## Future of Gaming

Technologies are developing so rapidly that games may become unrecognizable in just a few years.
    `,
    contentHtml: `<h1>Gaming Trends 2024</h1><p>The gaming industry continues to evolve...</p>`
  },
  {
    slug: "tech-innovations-2024-en",
    title: "Tech Innovations 2024: Breakthroughs Overview",
    excerpt: "From quantum computers to biotechnology - examining the most significant technological achievements of the year.",
    publishedAt: "2024-01-05T16:45:00Z",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop",
    category: { name: "Technology", slug: "tech" },
    content: `
# Tech Breakthroughs 2024

This year has been particularly rich in technological innovations. We observe progress in the most diverse areas - from computer technology to biomedicine.

## Key Areas

- Quantum computing reaching a new level
- Biotechnology and personalized medicine
- Sustainable technologies and green energy

## Impact on Society

These innovations are already beginning to change our lives for the better.
    `,
    contentHtml: `<h1>Tech Breakthroughs 2024</h1><p>This year has been particularly rich in technological innovations...</p>`
  },
  {
    slug: "digital-transformation-guide-en",
    title: "Digital Transformation Guide for Business",
    excerpt: "Step-by-step guide to implementing digital technologies in company business processes.",
    publishedAt: "2024-01-03T11:20:00Z",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
    category: { name: "Digital", slug: "digital" },
    content: `
# Digital Transformation: Where to Start

Digital transformation has become a necessity for most companies. But how to approach this process correctly?

## Transformation Stages

- Analysis of current state
- Setting goals and strategy
- Phased implementation of solutions

## Key Technologies

Cloud services, process automation, and data analytics - the foundation of successful transformation.
    `,
    contentHtml: `<h1>Digital Transformation: Where to Start</h1><p>Digital transformation has become a necessity...</p>`
  },
  {
    slug: "tech-news-weekly-january-en",
    title: "Tech News Weekly: January 2024",
    excerpt: "The most important technology news and announcements from the past week in the world of high technology.",
    publishedAt: "2024-01-01T08:00:00Z",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop",
    category: { name: "News", slug: "news-2" },
    content: `
# Tech News Weekly

Selection of the most interesting technology news from the past week.

## Main Events

- New announcements from major tech companies
- Breakthroughs in AI and machine learning
- Updates to popular services and platforms

## What to Expect Next

Even more interesting announcements and releases are expected in the coming weeks.
    `,
    contentHtml: `<h1>Tech News Weekly</h1><p>Selection of the most interesting technology news...</p>`
  },

  // ========== ПОЛЬСКИЕ ПЕРЕВОДЫ ==========
  {
    slug: "ai-revolution-2024-pl",
    title: "Rewolucja AI w 2024: Co nas czeka",
    excerpt: "Sztuczna inteligencja nadal rozwija się w szybkim tempie. Analizujemy główne trendy i przełomy tego roku.",
    publishedAt: "2024-01-15T10:00:00Z",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    category: { name: "Sztuczna Inteligencja", slug: "ai" },
    content: `
# Rewolucja AI w 2024 roku

Sztuczna inteligencja staje się integralną częścią naszego codziennego życia. W 2024 roku obserwujemy bezprecedensowe osiągnięcia w dziedzinie uczenia maszynowego i sieci neuronowych.

## Główne trendy

- Modele multimodalne stają się standardem
- Spersonalizowani asystenci AI
- Etyczne kwestie wykorzystania AI

## Przełomy roku

Firmy aktywnie wdrażają rozwiązania AI w swoich produktach, od autonomicznej jazdy po spersonalizowaną medycynę.
    `,
    contentHtml: `<h1>Rewolucja AI w 2024 roku</h1><p>Sztuczna inteligencja staje się integralną częścią naszego codziennego życia...</p>`
  },
  {
    slug: "apple-vision-pro-review-pl",
    title: "Apple Vision Pro: Recenzja rewolucyjnego urządzenia",
    excerpt: "Szczegółowa recenzja pierwszego urządzenia rzeczywistości mieszanej od Apple. Czy warto kupić i czego oczekiwać w przyszłości?",
    publishedAt: "2024-01-10T14:30:00Z",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=400&fit=crop",
    category: { name: "Apple", slug: "apple" },
    content: `
# Apple Vision Pro: Czy przyszłość już nadeszła?

Apple Vision Pro reprezentuje pierwszą próbę Apple wejścia na rynek rzeczywistości mieszanej. To urządzenie obiecuje zmienić nasze rozumienie interakcji z cyfrowym światem.

## Specyfikacje

- Wyświetlacze wysokiej rozdzielczości
- Intuicyjne sterowanie spojrzeniem
- Integracja z ekosystemem Apple

## Wrażenia

Urządzenie rzeczywiście imponuje swoimi możliwościami, ale wysoka cena sprawia, że nie jest dostępne dla każdego.
    `,
    contentHtml: `<h1>Apple Vision Pro: Czy przyszłość już nadeszła?</h1><p>Apple Vision Pro reprezentuje pierwszą próbę Apple...</p>`
  },
  {
    slug: "gaming-trends-2024-pl",
    title: "Trendy w grach 2024: Co się zmieni w branży",
    excerpt: "Gry w chmurze, gry VR i treści generowane przez AI - analizujemy główne trendy w branży gier.",
    publishedAt: "2024-01-08T09:15:00Z",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=400&fit=crop",
    category: { name: "Gry", slug: "games" },
    content: `
# Trendy w grach 2024

Branża gier nadal się rozwija, oferując graczom nowe formaty i technologie. W tym roku szczególnie wyróżnia się kilka kluczowych kierunków.

## Główne trendy

- Gry w chmurze stają się mainstreamem
- Gry VR i AR zyskują popularność  
- AI pomaga tworzyć treści do gier

## Przyszłość gier

Technologie rozwijają się tak szybko, że za kilka lat gry mogą stać się nie do poznania.
    `,
    contentHtml: `<h1>Trendy w grach 2024</h1><p>Branża gier nadal się rozwija...</p>`
  },
  {
    slug: "tech-innovations-2024-pl",
    title: "Innowacje technologiczne 2024: Przegląd przełomów",
    excerpt: "Od komputerów kwantowych po biotechnologie - analizujemy najważniejsze osiągnięcia technologiczne roku.",
    publishedAt: "2024-01-05T16:45:00Z",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop",
    category: { name: "Technologie", slug: "tech" },
    content: `
# Przełomy technologiczne 2024

Ten rok okazał się szczególnie bogaty w innowacje technologiczne. Obserwujemy postęp w najróżniejszych dziedzinach - od technologii komputerowych po biomedycynę.

## Kluczowe obszary

- Obliczenia kwantowe wychodzą na nowy poziom
- Biotechnologia i medycyna spersonalizowana
- Zrównoważone technologie i zielona energia

## Wpływ na społeczeństwo

Te innowacje już zaczynają zmieniać nasze życie na lepsze.
    `,
    contentHtml: `<h1>Przełomy technologiczne 2024</h1><p>Ten rok okazał się szczególnie bogaty w innowacje technologiczne...</p>`
  },
  {
    slug: "digital-transformation-guide-pl",
    title: "Przewodnik po transformacji cyfrowej dla biznesu",
    excerpt: "Krok po kroku przewodnik po wdrażaniu technologii cyfrowych w procesach biznesowych firmy.",
    publishedAt: "2024-01-03T11:20:00Z",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
    category: { name: "Digital", slug: "digital" },
    content: `
# Transformacja cyfrowa: Od czego zacząć

Transformacja cyfrowa stała się koniecznością dla większości firm. Ale jak właściwie podejść do tego procesu?

## Etapy transformacji

- Analiza obecnego stanu
- Określenie celów i strategii
- Etapowe wdrażanie rozwiązań

## Kluczowe technologie

Usługi w chmurze, automatyzacja procesów i analiza danych - podstawa udanej transformacji.
    `,
    contentHtml: `<h1>Transformacja cyfrowa: Od czego zacząć</h1><p>Transformacja cyfrowa stała się koniecznością...</p>`
  },
  {
    slug: "tech-news-weekly-january-pl",
    title: "Wiadomości technologiczne tygodnia: Styczeń 2024",
    excerpt: "Najważniejsze wiadomości technologiczne i ogłoszenia z minionego tygodnia w świecie wysokich technologii.",
    publishedAt: "2024-01-01T08:00:00Z",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop",
    category: { name: "Wiadomości", slug: "news-2" },
    content: `
# Wiadomości technologiczne tygodnia

Wybór najciekawszych wiadomości technologicznych z minionego tygodnia.

## Główne wydarzenia

- Nowe ogłoszenia od głównych firm technologicznych
- Przełomy w dziedzinie AI i uczenia maszynowego
- Aktualizacje popularnych usług i platform

## Czego oczekiwać dalej

W nadchodzących tygodniach oczekuje się jeszcze więcej interesujących ogłoszeń i wydań.
    `,
    contentHtml: `<h1>Wiadomości technologiczne tygodnia</h1><p>Wybór najciekawszych wiadomości technologicznych...</p>`
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
