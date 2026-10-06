import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { EarlyAuthProvider } from "@/components/early-auth";
import "./globals.css";
import "@/components/landing.css";
import "@/components/public-pages.css";

export const metadata: Metadata = {
  title: "Early | A place in the story",
  description: "Early is building a way to turn early support into recognition, access, and opportunity.",
  icons: {
    icon: "/early-logo.svg",
    apple: "/early-logo.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body><EarlyAuthProvider>{children}</EarlyAuthProvider></body>
    </html>
  );
}
