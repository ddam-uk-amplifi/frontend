import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";
import { QueryProvider } from "@/lib/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Consolas",
    "Liberation Mono",
    "Menlo",
    "monospace",
  ],
});

export const metadata: Metadata = {
  title: "Productivity",
  description:
    "Report automation and validation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AppLayout>{children}</AppLayout>
        </QueryProvider>
        <Toaster 
          position="top-right"
          expand={false}
          richColors
          duration={4000}
          toastOptions={{
            style: {
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            },
            className: 'toast-custom',
          }}
        />
      </body>
    </html>
  );
}
