import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WanderWrap Circles",
  description: "Great gifts. Together. AI-powered group gifting with PayPal.",
  icons: { icon: "/brand/wanderwrap-mark.png", apple: "/brand/wanderwrap-mark.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
