import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "GamMed",
  description: "Hospital Management ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
