"use client";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginPage } from "@/components/auth/login-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { EmployeeLayout } from "@/components/employee/employee-layout";

function AppRouter() {
  const { appView } = useAuth();

  switch (appView) {
    case "login":
      return <LoginPage />;
    case "admin":
      return <AdminLayout />;
    case "employee":
      return <EmployeeLayout />;
    default:
      return <LoginPage />;
  }
}

export default function Home() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}