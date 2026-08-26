import type { Metadata } from "next";
import { Playfair_Display, Inter, Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Editorial accent — v2 client redesign (section eyebrows, market-intelligence notes)
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Property Tiger | AI Investment Advisory",
  description: "AI-Powered Real Estate Investment Research Portal for Hyderabad's fastest-growing corridors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-luxury-bg text-text-primary" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
