"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const LEO_VISUALIZATION_URL = "https://platform.leolabs.space/visualizations/leo";

type EmbedCopy = Record<
  | "badge"
  | "posterTitle"
  | "posterText"
  | "launch"
  | "launchHint"
  | "loading"
  | "slow"
  | "fullscreen"
  | "exitFullscreen"
  | "newTab"
  | "reload"
  | "frameTitle"
  | "credit"
  | "creditTail"
  | "terms"
  | "fallbackNotice"
  | "fallbackCta",
  string
>;

const copy: Record<"en" | "pl", EmbedCopy> = {
  en: {
    badge: "Live data",
    posterTitle: "LeoLabs Low Earth Orbit Visualization",
    posterText:
      "An interactive 3D globe with every tracked object in low Earth orbit — payloads, spent rocket bodies and debris — propagated in real time.",
    launch: "Launch the simulator",
    launchHint: "Loads a third-party interactive scene from platform.leolabs.space",
    loading: "Loading orbital data…",
    slow: "The scene is taking a while. It needs WebGL and a stable connection — you can also open it in a separate tab.",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    newTab: "Open in a new tab",
    reload: "Reload",
    frameTitle: "LeoLabs Low Earth Orbit Visualization",
    credit: "Interactive visualization by",
    creditTail:
      "Embedded from platform.leolabs.space and shown as provided by its authors. Object positions are estimates, not navigation-grade data.",
    terms: "Terms for sharing",
    fallbackNotice:
      "Globe stays black? LeoLabs' 3D scene does not always start inside an embedded frame.",
    fallbackCta: "Open it full-page",
  },
  pl: {
    badge: "Dane na żywo",
    posterTitle: "Wizualizacja niskiej orbity okołoziemskiej LeoLabs",
    posterText:
      "Interaktywny globus 3D ze wszystkimi śledzonymi obiektami na niskiej orbicie — satelitami, zużytymi członami rakiet i śmieciami kosmicznymi — w czasie rzeczywistym.",
    launch: "Uruchom symulator",
    launchHint: "Ładuje interaktywną scenę zewnętrzną z platform.leolabs.space",
    loading: "Wczytywanie danych orbitalnych…",
    slow: "Scena ładuje się dłużej niż zwykle. Wymaga WebGL i stabilnego łącza — możesz też otworzyć ją w osobnej karcie.",
    fullscreen: "Pełny ekran",
    exitFullscreen: "Zamknij pełny ekran",
    newTab: "Otwórz w nowej karcie",
    reload: "Przeładuj",
    frameTitle: "Wizualizacja niskiej orbity okołoziemskiej LeoLabs",
    credit: "Interaktywna wizualizacja:",
    creditTail:
      "Osadzone z platform.leolabs.space i prezentowane w postaci udostępnionej przez autorów. Pozycje obiektów są szacunkowe i nie służą do nawigacji.",
    terms: "Warunki udostępniania",
    fallbackNotice:
      "Globus pozostaje czarny? Scena 3D LeoLabs nie zawsze uruchamia się w osadzonej ramce.",
    fallbackCta: "Otwórz na pełnej stronie",
  },
};

export function LeoSimulatorEmbed({ locale }: { locale: string }) {
  const t = copy[locale === "pl" ? "pl" : "en"];

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  // Bumping the key remounts the iframe, which is the only reliable way to
  // reset a cross-origin frame we cannot script into.
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    setCanFullscreen(typeof document !== "undefined" && !!document.fullscreenEnabled);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Surface a hint instead of leaving the reader staring at a spinner.
  useEffect(() => {
    if (!started || loaded) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [started, loaded, frameKey]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapperRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const reload = useCallback(() => {
    setLoaded(false);
    setSlow(false);
    setFrameKey((k) => k + 1);
  }, []);

  return (
    <figure className="not-prose my-10">
      <div
        ref={wrapperRef}
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col bg-neutral-950"
            : "overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 shadow-sm dark:border-neutral-800"
        }
      >
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-900 px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-neutral-100">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t.badge}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            {started && (
              <button
                type="button"
                onClick={reload}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t.reload}
              </button>
            )}
            {canFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {isFullscreen ? t.exitFullscreen : t.fullscreen}
              </button>
            )}
            <a
              href={LEO_VISUALIZATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              {t.newTab} ↗
            </a>
          </div>
        </div>

        {/* Stage */}
        <div
          className={
            isFullscreen
              ? "relative flex-1"
              : "relative h-[65vh] min-h-[420px] max-h-[760px] w-full"
          }
        >
          {!started ? (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_50%_120%,#1e3a8a_0%,#0f172a_45%,#020617_100%)] px-6 text-center"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_20%_30%,#fff,transparent),radial-gradient(1px_1px_at_75%_18%,#fff,transparent),radial-gradient(1px_1px_at_40%_70%,#fff,transparent),radial-gradient(1px_1px_at_88%_62%,#fff,transparent),radial-gradient(1px_1px_at_60%_45%,#fff,transparent),radial-gradient(1px_1px_at_12%_82%,#fff,transparent)]"
              />
              <span className="relative max-w-xl">
                <span className="block text-lg font-semibold text-white sm:text-xl">
                  {t.posterTitle}
                </span>
                <span className="mt-2 block text-sm text-neutral-300">{t.posterText}</span>
              </span>
              <span className="relative inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-transform group-hover:scale-[1.03]">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.3 3.8a1 1 0 0 1 1.02.04l8 5a1 1 0 0 1 0 1.7l-8 5A1 1 0 0 1 5.8 14.7V5.3a1 1 0 0 1 .5-.87Z" />
                </svg>
                {t.launch}
              </span>
              <span className="relative text-xs text-neutral-400">{t.launchHint}</span>
            </button>
          ) : (
            <>
              <iframe
                key={frameKey}
                src={LEO_VISUALIZATION_URL}
                title={t.frameTitle}
                onLoad={() => setLoaded(true)}
                allow="fullscreen; xr-spatial-tracking"
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
              />
              {!loaded && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
                  <span className="text-sm text-neutral-400">{t.loading}</span>
                  {slow && <span className="max-w-md text-xs text-neutral-500">{t.slow}</span>}
                </div>
              )}
            </>
          )}
        </div>

        {/* The framed scene can silently fail to start — a cross-origin frame gives us
            no way to detect that, so the escape hatch is always on screen. */}
        {started && !isFullscreen && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/10 bg-neutral-900 px-4 py-2.5 text-xs text-neutral-400">
            <span>{t.fallbackNotice}</span>
            <a
              href={LEO_VISUALIZATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2"
            >
              {t.fallbackCta} ↗
            </a>
          </p>
        )}
      </div>

      <figcaption className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        {t.credit}{" "}
        <a
          href="https://leolabs.space"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-900 underline underline-offset-2 dark:text-neutral-100"
        >
          LeoLabs
        </a>
        . {t.creditTail}{" "}
        <a
          href="https://platform.leolabs.space/visualizations_terms_for_sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {t.terms}
        </a>
        .
      </figcaption>
    </figure>
  );
}
