import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "vankycup - ヴァンキーカップエントリー",
  description: "チームエントリー、メンバーの登録などスムーズに登録できます",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="scroll-smooth">
      <body
        className={`${inter.variable} ${outfit.variable} ${notoSansJP.variable} font-noto-sans antialiased text-slate-100 min-h-screen bg-slate-950 selection:bg-indigo-500/30 selection:text-indigo-200`}
      >
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none -z-10" />
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.015] pointer-events-none -z-10" style={{ mixBlendMode: 'overlay' }} />
        {children}
      </body>
    </html>
  );
}
