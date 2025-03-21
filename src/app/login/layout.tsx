// app/login/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Login to access the admin dashboard",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      {children}
    </section>
  );
}