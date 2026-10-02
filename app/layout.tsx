import type { Metadata, Viewport } from "next";
import { APP_NAME, GROUP_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: `Books shared between ${GROUP_NAME} members`,
};

export const viewport: Viewport = {
  themeColor: "#244536",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Literata:opsz,wght@7..72,500;7..72,700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
