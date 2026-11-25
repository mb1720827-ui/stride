import type { Metadata, Viewport } from "next";
import { Overpass } from "next/font/google";
import "./globals.css";

// Overpass descends from road-sign lettering: clear at a glance, with sturdy figures for times.
const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "Stride",
  description: "Type a task, habit or skill in plain words. Stride plans it into your free time and keeps you on track.",
};

export const viewport: Viewport = {
  themeColor: "#0B7A45",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${overpass.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
