import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Assistance · Seu dia, com clareza",
  description: "Seu espaço pessoal para organizar a vida e os estudos.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
