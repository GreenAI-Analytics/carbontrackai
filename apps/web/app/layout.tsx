import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarbonTrackAI - Carbon Accounting for EU SMEs",
  description:
    "VSME-aligned carbon accounting platform. Measure and reduce emissions with ease.",
  icons: {
    icon: "/img/carbontrack-ai-logo.png",
    shortcut: "/img/carbontrack-ai-logo.png",
    apple: "/img/carbontrack-ai-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
