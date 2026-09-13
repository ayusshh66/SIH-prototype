import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/domain/Shell/Header";
import { Sidebar } from "../components/domain/Shell/Sidebar";

export const metadata: Metadata = {
  title: "IR Operations Command",
  description: "Indian Railways AI-Powered Automatic Block Planning System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background-main text-text-primary flex flex-col font-sans">
        <Header />
        <div className="flex flex-1 pt-14">
          <Sidebar />
          <main className="flex-1 ml-16 md:ml-64 p-6 min-h-[calc(100vh-3.5rem)] bg-background-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
