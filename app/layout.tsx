import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import Background from "./components/Background";
import SideMenu from "./components/SideMenu";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "תצוגת קיר",
  description: "תצוגת קיר משפחתית",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "תצוגה",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#26304a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full antialiased`}
    >
      <body
        className="relative flex h-full overflow-hidden text-neutral-100 select-none overscroll-none"
        style={{ backgroundColor: "#26304a" }}
      >
        <Background />
        <SideMenu />
        {children}
      </body>
    </html>
  );
}
