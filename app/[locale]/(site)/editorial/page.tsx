import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getTranslation } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  
  return {
    title: `${t.editorial} | ${t.siteTitle}`,
    description: "icoffio Editorial - team of technology experts",
    keywords: "editorial, team, icoffio, technology, journalists",
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
            icoffio Team of Experts
          </p>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              About Our Editorial Team
            </h2>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              The icoffio editorial team brings together experienced journalists, analysts, and technology experts. 
              We follow the latest trends in high technology, artificial intelligence, 
              mobile devices, and digital innovations.
            </p>
            <p className="text-neutral-700 dark:text-neutral-300 mb-6">
              Our mission is to provide readers with current, reliable, and useful information 
              about technological innovations that shape our future.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Our Principles
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 dark:text-neutral-300">
              <li><strong>Reliability:</strong> We verify every fact and source of information</li>
              <li><strong>Timeliness:</strong> We cover the freshest news from the technology world</li>
              <li><strong>Expertise:</strong> We engage recognized specialists for analysis</li>
              <li><strong>Accessibility:</strong> We explain complex technologies in simple language</li>
              <li><strong>Independence:</strong> We express objective opinions and evaluations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Editorial Contacts
            </h2>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-6 rounded-lg">
              <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                <strong>Email:</strong> editorial@icoffio.com
              </p>
              <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                <strong>Suggestions and Collaboration:</strong> contact@icoffio.com
              </p>
              <p className="text-neutral-700 dark:text-neutral-300">
                <strong>Press Releases:</strong> press@icoffio.com
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Join Us
            </h2>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              If you share our passion for technology and would like to join the team, 
              send your resume and portfolio to careers@icoffio.com
            </p>
            <p className="text-neutral-700 dark:text-neutral-300">
              We're always open to talented writers, editors, and technical experts.
            </p>
          </section>
        </div>
      </div>
    </Container>
  );
}

