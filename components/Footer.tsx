import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-200">
      <Container>
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand section */}
            <div className="md:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <span className="font-bold text-xl">icoffio</span>
              </Link>
              <p className="text-neutral-600 mb-4 max-w-sm">
                Covering the most important events in the world of technology
              </p>
            </div>

            {/* About section */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-4">About</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                    Editorial
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                    Advertising
                  </Link>
                </li>
              </ul>
            </div>

            {/* Apps section */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-4">Applications</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                    iOS App
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                    Android App
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Social links */}
          <div className="mt-8 pt-8 border-t border-neutral-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-neutral-500 text-sm">
                © 2024 icoffio. All rights reserved.
              </div>
              
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-medium text-neutral-700">Follow Us</h4>
                <div className="flex items-center gap-3">
                  {/* VK */}
                  <Link href="#" className="text-neutral-400 hover:text-blue-600 transition-colors">
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.715-1.033-1.01-1.49-.832-1.708-.832-.356 0-.455.102-.455.597v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.082c0-.218.102-.42.597-.42h1.744c.457 0 .628.203.804.678.915 2.445 2.453 4.593 3.08 4.593.238 0 .345-.11.345-.712V9.78c-.102-1.183-.695-1.284-.695-1.702 0-.178.145-.356.372-.356h2.747c.382 0 .525.203.525.643v3.473c0 .381.17.525.271.525.238 0 .436-.144.864-.577 1.295-1.442 2.229-3.677 2.229-3.677.127-.271.322-.526.795-.526h1.744c.542 0 .661.271.542.643-.203.645-2.32 4.181-2.32 4.181-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.743-.576.743z"/>
                    </svg>
                  </Link>
                  
                  {/* YouTube */}
                  <Link href="#" className="text-neutral-400 hover:text-red-600 transition-colors">
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </Link>
                  
                  {/* Twitter */}
                  <Link href="#" className="text-neutral-400 hover:text-blue-400 transition-colors">
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </Link>
                  
                  {/* Telegram */}
                  <Link href="#" className="text-neutral-400 hover:text-blue-500 transition-colors">
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}