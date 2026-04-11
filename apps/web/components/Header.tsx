import Image from "next/image";

export function Header() {
  return (
    <header className="fixed w-full top-0 z-50 bg-white shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/img/carbontrack-ai-logo.png"
            alt="CarbonTrackAI logo"
            width={240}
            height={60}
            className="h-12 w-auto"
            style={{ width: "auto" }}
            priority
          />
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-600 hover:text-gray-900">
            Features
          </a>
          <a href="#why" className="text-gray-600 hover:text-gray-900">
            Why Choose Us
          </a>
          <a href="#pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-4">
          <a href="/login" className="text-gray-600 hover:text-gray-900">
            Log In
          </a>
          <a href="/signup" className="btn-primary">
            Get Started
          </a>
        </div>
      </nav>
    </header>
  );
}
