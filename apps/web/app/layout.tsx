import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarbonTrackAI — ESG Reporting for EU SMEs",
  description:
    "One-stop ESG reporting platform for EU SMEs (< 250 employees). CSRD/ESRS-compliant disclosures covering Environmental (E1–E5), Social (S1–S4), Governance (G1), Double Materiality, and EU Taxonomy. VSME-first, made simple.",
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
