import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { HeroUIProvider } from "@heroui/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image2Prompt - AI Image Generator",
  description: "Analyze images and generate new ones with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="zh-CN" className="h-full">
        <body className="min-h-full bg-gray-50">
          <HeroUIProvider>{children}</HeroUIProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
