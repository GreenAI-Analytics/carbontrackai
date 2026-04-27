import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarbonTrackAI — CSRD & ESRS ESG Reporting Software for EU Businesses",
  description:
    "CSRD and ESRS compliant ESG reporting platform covering Environmental (E1–E5), Social (S1–S4), and Governance (G1) disclosures. Built for European SMEs — from double materiality to EU Taxonomy alignment and audit-ready reports.",
  keywords: [
    "ESG reporting software",
    "CSRD compliance",
    "ESRS reporting",
    "EU Taxonomy",
    "double materiality",
    "carbon accounting EU",
    "sustainability reporting SME",
    "VSME standard",
    "European SMEs ESG",
  ],
  openGraph: {
    title: "CarbonTrackAI — CSRD & ESRS ESG Reporting Software",
    description:
      "The one-stop ESG reporting platform for European businesses. Environmental, Social, and Governance disclosures — from double materiality to audit-ready reports.",
    type: "website",
    siteName: "CarbonTrackAI",
  },
  robots: {
    index: true,
    follow: true,
  },
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
