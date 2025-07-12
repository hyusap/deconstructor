import type { Metadata } from "next";
import { Noto_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import PlausibleProvider from "next-plausible";
import Outbound from "@/components/outbound";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deconstructor - Etymology & Linguistic Analysis",
  description:
    "Discover the etymology and origins of any word with our interactive deconstructor. Explore word parts, meanings, and linguistic roots from Latin, Greek, and other languages through beautiful visualizations.",
  keywords: [
    "etymology",
    "word origin",
    "linguistic analysis",
    "word deconstruction",
    "language roots",
    "word meaning",
    "Latin etymology",
    "Greek etymology",
    "word parts",
    "morphology",
    "lexicology",
  ].join(", "),
  authors: [{ name: "Ayush Paul" }],
  creator: "Ayush Paul",
  publisher: "Ayush Paul",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://deconstructor.app"),
  alternates: {
    canonical: "https://deconstructor.app",
  },
  openGraph: {
    title: "Deconstructor - Interactive Etymology Analysis",
    siteName: "Deconstructor",
    description:
      "Discover the etymology and origins of any word with interactive visualizations. Explore linguistic roots and word meanings.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Deconstructor - Interactive Etymology Analysis",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deconstructor - Interactive Etymology Analysis",
    description:
      "Discover the etymology and origins of any word with interactive visualizations.",
    images: ["/og.png"],
    site: "@deconstructor",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider
          domain="deconstructor.app"
          customDomain="https://a.ayush.digital"
          trackOutboundLinks
          selfHosted
          taggedEvents
          enabled
        />
      </head>
      <body className={`${notoSerif.className} antialiased dark`}>
        <Outbound />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
