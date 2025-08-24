import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="font-bold text-xl text-neutral-900 dark:text-neutral-100">icoffio</span>
            </Link>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 max-w-sm">
              Covering the most important events in the world of technology
            </p>
          </div>

          {/* About section */}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  Editorial
                </Link>
              </li>
              <li>
                <Link href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  Advertising
                </Link>
              </li>
            </ul>
          </div>

          {/* Apps section */}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Applications</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  iOS App
                </Link>
              </li>
              <li>
                <Link href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
                  Android App
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-neutral-500 dark:text-neutral-400 text-sm">
              © 2025 icoffio. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}