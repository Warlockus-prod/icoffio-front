import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LeoSimulatorEmbed } from "@/components/LeoSimulatorEmbed";
import { ArticleViewTracker } from "@/components/ArticleViewTracker";
import { getFeatureSlug } from "@/lib/feature-pages";
import { getTranslation } from "@/lib/i18n";

type Section = {
  heading: string;
  paragraphs: string[];
  /** Optional bullet list, rendered in a callout box. Supports **bold** spans. */
  list?: string[];
  /** Optional paragraph rendered after the list. */
  after?: string;
};

type PageContent = {
  breadcrumb: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  kicker: string;
  title: string;
  lede: string;
  intro: string[];
  sections: Section[];
  embedIntro: string;
  outroHeading: string;
  outro: string;
};

const content: Record<"en" | "pl", PageContent> = {
  en: {
    breadcrumb: "LEO Simulator",
    metaTitle: "LEO Simulator: watch 27,000 objects orbit Earth in real time",
    metaDescription:
      "LeoLabs' Low Earth Orbit Visualization is a live 3D map of every satellite, rocket body and piece of debris tracked in LEO. We explain how it works and embed it here so you can fly it yourself.",
    keywords:
      "LEO simulator, LeoLabs, low Earth orbit, space debris, satellite tracking, orbital visualization, space situational awareness",
    kicker: "Interactive",
    title: "LEO Simulator: 27,000 objects circling Earth, live",
    lede:
      "LeoLabs keeps a running census of everything humanity has left in low Earth orbit — and publishes it as an interactive 3D globe. Here is what the map shows, where the numbers come from, and how to actually fly it.",
    intro: [
      "Low Earth orbit is no longer empty. Between 200 and 2,000 kilometres up there are working satellites, dead satellites, spent rocket stages and tens of thousands of fragments from four decades of collisions, explosions and anti-satellite tests. Most of it is invisible from the ground and none of it is stationary — everything is moving at roughly 7–8 kilometres per second.",
      "LeoLabs, a company that operates its own network of ground radars, turns that census into something you can look at. Its Low Earth Orbit Visualization renders the entire tracked catalogue on a 3D Earth and propagates every object forward in time. Open it and you are not watching an artist's impression: you are watching a physics model driven by real radar measurements.",
    ],
    sections: [
      {
        heading: "What you are looking at",
        paragraphs: [
          "Each mote around the globe is one tracked object, colour-coded by what it is. Green is a payload — a satellite, working or not. Yellow is a rocket body, the upper stage that put something up there and never came down. Red is debris. Blue is an object that has not been classified yet.",
          "A clock in the corner shows the current UTC time and the number of objects on screen. When we loaded it while writing this piece, it read 27,508. That figure moves: new launches add to it, re-entries subtract from it, and a single break-up event can add hundreds of fragments in an afternoon.",
          "One caveat is printed on the map itself — special events are not shown. This is the routine catalogue, not a live feed of conjunctions, manoeuvres or emergencies.",
        ],
      },
      {
        heading: "How to fly it",
        paragraphs: [
          "The panel on the left is where the visualization stops being a poster and starts being a tool.",
        ],
        list: [
          "**Search** — type a satellite name to find and lock onto a specific object.",
          "**Speed** — a time-warp slider. Slow it to watch a single pass, or run it fast to see whole orbital planes precess.",
          "**Debris** — off by default. Turn it on and the picture changes character completely; this is the toggle worth flipping first.",
          "**Beams and Instruments** — draw LeoLabs' own radar sites and the fans of energy they sweep through orbit. It is a good way to see how the catalogue is actually built.",
          "**Follow Earth** — keep the camera locked to the rotating planet, or let the stars stay fixed and watch Earth turn beneath the orbits.",
          "**Views** — recolour everything by object type, perigee, orbital period, inclination or country of origin. The country view is the geopolitical picture of orbit in one click.",
          "**Filters** — set a minimum and maximum on a parameter to strip the display down to the shell you care about.",
        ],
        after:
          "Drag to rotate, scroll to zoom. It opens zoomed in close to the surface, so scroll out a few notches first to get the whole-planet view — that is the one that tends to change how people think about orbit.",
      },
      {
        heading: "Where the data comes from",
        paragraphs: [
          "This is the part that separates the LeoLabs map from the many pretty satellite globes built on public two-line element sets. LeoLabs measures the objects itself.",
          "The company was founded in 2016 as a spin-out of SRI International and is based in Menlo Park, California. It builds and runs phased-array radars — around a dozen of them across seven sites as of late 2025, including installations in Alaska, Texas, New Zealand, Costa Rica, Australia, the Azores and Argentina. Each site watches a slice of sky and clocks objects as they pass through, hundreds of thousands of times a day.",
          "Those measurements feed an orbit-determination pipeline that produces state vectors, propagations, pass predictions and conjunction assessments. LeoLabs says the resulting orbits are one to two orders of magnitude more accurate than public TLEs, and the catalogue is supplied into the US Space Force's Unified Data Library and the Commerce Department's TraCSS space-traffic system. The operational catalogue is dominated by objects 10 centimetres and larger; newer radars are aimed at pushing the detection floor toward 2 centimetres.",
        ],
      },
      {
        heading: "Why anyone bothers tracking this",
        paragraphs: [
          "A 1-centimetre fragment at orbital velocity carries about as much kinetic energy as a hand grenade. There is no shielding a satellite against that, so the only defence is knowing where the fragment will be and moving out of the way — which requires an accurate orbit for both objects, days in advance.",
          "The pressure is rising. Commercial constellations have added thousands of active satellites in a few years, and the 2007 Fengyun-1C and 2009 Iridium–Kosmos events alone left debris clouds that will be in orbit for decades. The concern behind all of it is the Kessler syndrome: a density of debris high enough that collisions generate new debris faster than it decays, making some altitudes progressively less usable.",
          "Tracking will not clear the orbits by itself. But nothing else — collision avoidance, re-entry prediction, debris removal, orbital regulation — works without it, and a map like this is the clearest way to see what the problem actually looks like.",
        ],
      },
      {
        heading: "Before you open it",
        paragraphs: [
          "The scene is rendered with WebGL and pushes tens of thousands of moving objects, so it wants a reasonably modern GPU and will make a laptop fan spin. On phones it works but runs warm — turning off debris helps.",
          "It is also happiest as a full page. LeoLabs embeds this exact view on its own site, but in a frame on someone else's domain the 3D scene sometimes refuses to start and leaves a black rectangle. If that happens, open it full-page — the visualization itself is fine.",
          "Positions are estimates from a tracking model. They are excellent for understanding orbit; they are not navigation-grade data, and LeoLabs publishes the visualization as-is without warranty.",
        ],
      },
    ],
    embedIntro:
      "Try it below — it loads on click, and there is a fullscreen button in the toolbar. LeoLabs built the scene to run on their own page, so if the globe does not start inside the frame, the toolbar link opens it full-page.",
    outroHeading: "The short version",
    outro:
      "It is the most legible picture of orbital congestion available to the public, built on measurements rather than estimates, and it is free to look at. Give it five minutes with the debris layer on.",
  },
  pl: {
    breadcrumb: "Symulator LEO",
    metaTitle: "Symulator LEO: 27 000 obiektów na orbicie Ziemi w czasie rzeczywistym",
    metaDescription:
      "Wizualizacja niskiej orbity okołoziemskiej LeoLabs to żywa mapa 3D wszystkich śledzonych satelitów, członów rakiet i śmieci kosmicznych. Wyjaśniamy, jak działa, i osadzamy ją tutaj.",
    keywords:
      "symulator LEO, LeoLabs, niska orbita okołoziemska, śmieci kosmiczne, śledzenie satelitów, wizualizacja orbitalna",
    kicker: "Interaktywne",
    title: "Symulator LEO: 27 000 obiektów krążących wokół Ziemi, na żywo",
    lede:
      "LeoLabs prowadzi nieustanny spis wszystkiego, co ludzkość zostawiła na niskiej orbicie — i publikuje go jako interaktywny globus 3D. Oto co pokazuje ta mapa, skąd biorą się liczby i jak jej realnie używać.",
    intro: [
      "Niska orbita okołoziemska nie jest już pusta. Między 200 a 2000 kilometrów nad Ziemią krążą działające satelity, martwe satelity, zużyte człony rakiet i dziesiątki tysięcy fragmentów po czterech dekadach zderzeń, eksplozji i testów broni antysatelitarnej. Większości z tego nie widać z ziemi i nic nie stoi w miejscu — wszystko porusza się z prędkością około 7–8 kilometrów na sekundę.",
      "LeoLabs, firma prowadząca własną sieć radarów naziemnych, zamienia ten spis w coś, na co można patrzeć. Jej wizualizacja niskiej orbity renderuje cały śledzony katalog na trójwymiarowej Ziemi i propaguje każdy obiekt w czasie. To nie jest wizja artystyczna: to model fizyczny zasilany rzeczywistymi pomiarami radarowymi.",
    ],
    sections: [
      {
        heading: "Co właściwie widzisz",
        paragraphs: [
          "Każdy punkt wokół globu to jeden śledzony obiekt, oznaczony kolorem według typu. Zielony to ładunek — satelita, działający lub nie. Żółty to człon rakiety, górny stopień, który coś wyniósł i nigdy nie wrócił. Czerwony to śmieci. Niebieski to obiekt jeszcze niesklasyfikowany.",
          "Zegar w rogu pokazuje aktualny czas UTC i liczbę obiektów na ekranie. Gdy otwieraliśmy wizualizację podczas pisania tego tekstu, wskazywała 27 508. Ta liczba się zmienia: nowe starty ją podnoszą, wejścia w atmosferę obniżają, a pojedyncze rozpadnięcie się obiektu potrafi dodać setki fragmentów w jedno popołudnie.",
          "Jedno zastrzeżenie jest wypisane na samej mapie — zdarzenia szczególne nie są pokazywane. To rutynowy katalog, a nie transmisja bliskich przelotów, manewrów czy sytuacji awaryjnych.",
        ],
      },
      {
        heading: "Jak tym sterować",
        paragraphs: [
          "Panel po lewej to moment, w którym wizualizacja przestaje być plakatem, a staje się narzędziem.",
        ],
        list: [
          "**Search** — wpisz nazwę satelity, aby znaleźć konkretny obiekt i się na nim skupić.",
          "**Speed** — suwak przyspieszenia czasu. Zwolnij, by obejrzeć pojedynczy przelot, albo przyspiesz, by zobaczyć precesję całych płaszczyzn orbitalnych.",
          "**Debris** — domyślnie wyłączone. Po włączeniu obraz zmienia się nie do poznania; to przełącznik, od którego warto zacząć.",
          "**Beams i Instruments** — rysują radary LeoLabs i wiązki, którymi omiatają orbitę. Dobry sposób, by zobaczyć, jak ten katalog naprawdę powstaje.",
          "**Follow Earth** — kamera przypięta do obracającej się planety albo nieruchome gwiazdy i Ziemia kręcąca się pod orbitami.",
          "**Views** — przekoloruj wszystko według typu obiektu, perygeum, okresu obiegu, inklinacji lub kraju pochodzenia. Widok krajów to geopolityczny obraz orbity w jednym kliknięciu.",
          "**Filters** — ustaw wartość minimalną i maksymalną parametru, by zawęzić widok do interesującej cię powłoki.",
        ],
        after:
          "Przeciągaj, aby obracać, przewijaj, aby przybliżać. Scena otwiera się mocno przybliżona do powierzchni, więc najpierw oddal ją o kilka kroków, żeby zobaczyć całą planetę — to ten widok zwykle zmienia sposób myślenia o orbicie.",
      },
      {
        heading: "Skąd pochodzą dane",
        paragraphs: [
          "To właśnie odróżnia mapę LeoLabs od wielu ładnych globusów satelitarnych zbudowanych na publicznych zestawach TLE. LeoLabs sam mierzy te obiekty.",
          "Firma powstała w 2016 roku jako spin-off SRI International i ma siedzibę w Menlo Park w Kalifornii. Buduje i eksploatuje radary z anteną fazowaną — pod koniec 2025 roku było ich około tuzina w siedmiu lokalizacjach, m.in. na Alasce, w Teksasie, Nowej Zelandii, Kostaryce, Australii, na Azorach i w Argentynie. Każda stacja obserwuje wycinek nieba i rejestruje obiekty przelatujące przez wiązkę, setki tysięcy razy dziennie.",
          "Te pomiary zasilają proces wyznaczania orbit, który daje wektory stanu, propagacje, prognozy przelotów i oceny bliskich zbliżeń. LeoLabs deklaruje, że uzyskane orbity są o jeden do dwóch rzędów wielkości dokładniejsze niż publiczne TLE, a katalog trafia do Unified Data Library Sił Kosmicznych USA oraz do systemu ruchu kosmicznego TraCSS Departamentu Handlu. W katalogu operacyjnym dominują obiekty o wielkości 10 centymetrów i większe; nowsze radary mają obniżyć próg wykrywalności w stronę 2 centymetrów.",
        ],
      },
      {
        heading: "Po co w ogóle to śledzić",
        paragraphs: [
          "Fragment o średnicy 1 centymetra przy prędkości orbitalnej niesie mniej więcej tyle energii kinetycznej co granat ręczny. Nie da się przed tym osłonić satelity, więc jedyną obroną jest wiedzieć, gdzie ten fragment będzie, i zejść mu z drogi — a to wymaga dokładnej orbity obu obiektów, z kilkudniowym wyprzedzeniem.",
          "Presja rośnie. Komercyjne konstelacje dodały w kilka lat tysiące aktywnych satelitów, a same zdarzenia z Fengyun-1C w 2007 roku i zderzenie Iridium z Kosmosem w 2009 roku zostawiły chmury szczątków, które pozostaną na orbicie przez dekady. W tle stoi obawa przed syndromem Kesslera: gęstością śmieci na tyle dużą, że zderzenia tworzą nowe odłamki szybciej, niż stare wchodzą w atmosferę, przez co niektóre wysokości stają się coraz mniej używalne.",
          "Samo śledzenie orbit nie oczyści. Ale bez niego nie działa nic innego — ani unikanie kolizji, ani prognozy wejścia w atmosferę, ani usuwanie śmieci, ani regulacje — a taka mapa jest najczytelniejszym sposobem, by zobaczyć, jak ten problem naprawdę wygląda.",
        ],
      },
      {
        heading: "Zanim otworzysz",
        paragraphs: [
          "Scena renderuje się w WebGL i obsługuje dziesiątki tysięcy ruchomych obiektów, więc wymaga w miarę nowoczesnego układu graficznego i rozkręci wentylator laptopa. Na telefonach działa, ale grzeje — pomaga wyłączenie warstwy śmieci.",
          "Najlepiej czuje się też jako pełna strona. LeoLabs osadza dokładnie ten widok u siebie, ale w ramce na cudzej domenie scena 3D czasem nie startuje i zostaje czarny prostokąt. Jeśli tak się stanie, otwórz ją na pełnej stronie — z samą wizualizacją wszystko jest w porządku.",
          "Pozycje są szacunkami z modelu śledzenia. Świetnie nadają się do zrozumienia orbity, ale nie są danymi nawigacyjnymi, a LeoLabs udostępnia wizualizację w stanie, w jakim jest, bez gwarancji.",
        ],
      },
    ],
    embedIntro:
      "Sprawdź poniżej — ładuje się po kliknięciu, a na pasku narzędzi jest przycisk pełnego ekranu. LeoLabs przygotował tę scenę pod własną stronę, więc jeśli globus nie uruchomi się w ramce, link na pasku otworzy go na pełnej stronie.",
    outroHeading: "W skrócie",
    outro:
      "To najbardziej czytelny publicznie dostępny obraz zatłoczenia orbity, zbudowany na pomiarach, a nie szacunkach, i darmowy. Poświęć mu pięć minut z włączoną warstwą śmieci.",
  },
};

function getContent(locale: string): PageContent {
  return content[locale === "pl" ? "pl" : "en"];
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = getTranslation(params.locale as any);
  const c = getContent(params.locale);
  const path = `/${params.locale}/leo-simulator`;

  return {
    title: `${c.metaTitle} | ${t.siteTitle}`,
    description: c.metaDescription,
    keywords: c.keywords,
    alternates: {
      canonical: path,
      languages: {
        en: "/en/leo-simulator",
        pl: "/pl/leo-simulator",
      },
    },
    openGraph: {
      type: "article",
      title: c.metaTitle,
      description: c.metaDescription,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.metaDescription,
    },
  };
}

/** Renders inline **bold** spans without pulling in a markdown dependency. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((chunk, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {chunk}
          </strong>
        ) : (
          <span key={i}>{chunk}</span>
        )
      )}
    </>
  );
}

export default function LeoSimulatorPage({ params }: { params: { locale: string } }) {
  const c = getContent(params.locale);

  return (
    <Container>
      {/* Counts toward the same popularity ranking as regular articles. */}
      <ArticleViewTracker articleSlug={getFeatureSlug("leo-simulator", params.locale)} />

      <Breadcrumbs
        items={[{ label: c.breadcrumb, href: `/${params.locale}/leo-simulator` }]}
        locale={params.locale}
      />

      <article className="max-w-4xl mx-auto pb-16">
        <header className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {c.kicker}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-neutral-900 dark:text-neutral-100 sm:text-5xl">
            {c.title}
          </h1>
          <p className="mt-5 text-xl leading-relaxed text-neutral-600 dark:text-neutral-300">
            {c.lede}
          </p>
        </header>

        <div className="space-y-5 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
          {c.intro.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          <p className="text-neutral-600 dark:text-neutral-400">{c.embedIntro}</p>
        </div>

        <LeoSimulatorEmbed locale={params.locale} />

        <div className="space-y-12">
          {c.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {section.heading}
              </h2>

              <div className="space-y-5 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}

                {section.list && (
                  <ul className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-base dark:border-neutral-800 dark:bg-neutral-900/50">
                    {section.list.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                        />
                        <span>
                          <RichText text={item} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.after && <p>{section.after}</p>}
              </div>
            </section>
          ))}

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {c.outroHeading}
            </h2>
            <p className="text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
              {c.outro}
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
