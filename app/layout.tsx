import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { PostHogProvider } from "@/app/components/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://businesscoachai.app"),
  title: "AI Business Coach",
  description: "Lance ton business avec un coach IA qui te suit pas à pas.",
  // PWA manifest (icons + theme color when the site is installed on mobile).
  // The favicon / app icon / apple icon are auto-detected by Next.js from
  // app/favicon.ico, app/icon.png, app/apple-icon.png — no need to declare here.
  manifest: "/site.webmanifest",
  themeColor: "#0a0118",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
