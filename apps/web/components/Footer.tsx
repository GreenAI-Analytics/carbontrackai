import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/img/carbontrack-ai-logo.png"
                alt="CarbonTrackAI logo"
                width={240}
                height={60}
                className="h-10 w-auto brightness-0 invert"
                style={{ width: "auto" }}
              />
            </div>
            <p className="text-sm">
              From NACE Code to CSRD Report in Minutes — the all-in-one ESRS compliance platform for European SMEs.
            </p>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Built by</p>
              <a
                href="https://greenaianalytics.org"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded-xl bg-white/90 px-3 py-2 hover:bg-white transition"
              >
                <Image
                  src="/img/greenai-analytics-logo.png"
                  alt="GreenAI Analytics logo"
                  width={80}
                  height={84}
                  className="h-16 w-auto"
                  style={{ width: "auto" }}
                />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://greenaianalytics.org" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  Compliance Tracker
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-primary-400">
                  Carbon Track AI
                </a>
              </li>
              <li>
                <a href="https://greenaianalytics.org#os-for-work" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  OS For Work
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://greenaianalytics.org" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  Home
                </a>
              </li>
              <li>
                <a href="https://calendly.com/zamil-khan-carbontrackai/intro" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  Book a Demo
                </a>
              </li>
              <li>
                <a href="https://greenaianalytics.org#faq" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://greenaianalytics.org#contact" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  Contact
                </a>
              </li>
              <li>
                <a href="https://github.com/GreenAI-Analytics/carbontrackai" target="_blank" rel="noreferrer" className="hover:text-primary-400">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 text-center text-sm">
          <p>
            &copy; 2026 GreenAI Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
