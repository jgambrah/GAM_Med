import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-provider";
import { ToasterProvider } from "@/context/toaster-provider";
import { FirebaseClientProvider } from "@/firebase/client-provider";

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
        <FirebaseClientProvider>
          <AuthProvider>
            {children}
            <ToasterProvider />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
