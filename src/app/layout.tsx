import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "./tokens.css";
import "./globals.css";
import "./materials.css";
import "./training.css";
import "./protocols.css";
import "./nutrition.css";
import "./studio.css";
import "./apollo.css";
export const metadata: Metadata = {
  title: "Legacy Juntos · Life, together",
  description: "Two lives. Growing individually. Building together.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080a09",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
