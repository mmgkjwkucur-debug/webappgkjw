import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GKJW - Informasi Jemaat",
  description: "Beranda informasi, artikel, dan jadwal pelayanan gereja.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
