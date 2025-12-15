import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: `${t.advertising} | ${t.siteTitle}`,
    description: "Advertising on icoffio - effective way to reach technology audience",
    keywords: "advertising, media kit, icoffio, technology, audience",
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
            Your path to technology audience
          </p>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Why icoffio?
            </h2>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              icoffio is a leading technology publication that brings together an active and solvent audience 
              of IT specialists, technology enthusiasts, and decision-makers in the field of high technology.
            </p>
            <div className="grid md:grid-cols-3 gap-6 my-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">50K+</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Unique visitors per month</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">75%</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">IT specialists and tech enthusiasts</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">3.5min</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Average time on site</div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Advertising Formats
            </h2>
            <div className="space-y-6">
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  🖼️ Display Advertising
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                  Banners of various formats for maximum audience reach
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Banner 728x90 (leaderboard)</li>
                  <li>• Banner 300x250 (rectangle)</li>
                  <li>• Banner 300x600 (skyscraper)</li>
                  <li>• Banner 970x250 (billboard)</li>
                </ul>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  📝 Native Advertising
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                  Integrated content that fits organically into the news feed
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Sponsored articles</li>
                  <li>• Product reviews</li>
                  <li>• Case studies</li>
                  <li>• Expert opinions</li>
                </ul>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  📧 Email Newsletter
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-3">
                  Direct delivery to subscribers' inboxes
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Weekly news digest</li>
                  <li>• Special digests</li>
                  <li>• Event announcements</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Our Audience
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3 text-neutral-900 dark:text-neutral-100">
                  👨‍💼 Professions
                </h3>
                <ul className="text-neutral-700 dark:text-neutral-300 space-y-1">
                  <li>• IT Directors and CTOs</li>
                  <li>• Developers and programmers</li>
                  <li>• System administrators</li>
                  <li>• Product and Project managers</li>
                  <li>• Technology consultants</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3 text-neutral-900 dark:text-neutral-100">
                  📊 Interests
                </h3>
                <ul className="text-neutral-700 dark:text-neutral-300 space-y-1">
                  <li>• Artificial intelligence</li>
                  <li>• Cloud technologies</li>
                  <li>• Mobile devices</li>
                  <li>• Cybersecurity</li>
                  <li>• Innovative startups</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Pricing
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                Advertising costs depend on the chosen format, campaign duration, and seasonality. 
                We offer flexible terms and an individual approach to each client.
              </p>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <p className="mb-2">• Display advertising: from $50 per 1000 impressions</p>
                <p className="mb-2">• Native advertising: from $500 per article</p>
                <p>• Email newsletter: from $200 per placement</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Contact Us
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                Ready to start an advertising campaign or want to get a detailed media kit? 
                Contact our sales department:
              </p>
              <div className="space-y-2">
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>📧 Email:</strong> advertising@icoffio.com
                </p>
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>📱 Telegram:</strong> @icoffio_ads
                </p>
                <p className="text-neutral-700 dark:text-neutral-300">
                  <strong>🕐 Working hours:</strong> Mon-Fri, 9:00-18:00 (CET)
                </p>
              </div>
              <div className="mt-6">
                <a 
                  href="mailto:advertising@icoffio.com?subject=Advertising inquiry"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send inquiry
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}

