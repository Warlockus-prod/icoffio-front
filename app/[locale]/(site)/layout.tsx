import "@/styles/globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WebVitals } from "@/components/WebVitals";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "icoffio — гаджеты, технологии и многое другое", template: "%s • icoffio" },
  description: "Рассказываем о важных событиях в мире технологий. Новости, обзоры и статьи об Apple, ИИ, играх и новых технологиях.",
  keywords: "технологии, гаджеты, Apple, iPhone, AI, игры, новости, обзоры",
  openGraph: { 
    title: "icoffio — технологический медиа", 
    description: "Самые актуальные новости и обзоры из мира технологий", 
    images: ["/og.png"], 
    type: "website",
    locale: "ru_RU" 
  },
  twitter: {
    card: "summary_large_image",
    title: "icoffio — технологии и гаджеты",
    description: "Актуальные новости из мира технологий",
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-dvh bg-white text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white">
        <WebVitals />
        <Header />
        <main className="pb-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
