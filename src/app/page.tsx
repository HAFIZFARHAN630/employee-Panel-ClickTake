"use client";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginPage } from "@/components/auth/login-page";
import { SignupPage } from "@/components/auth/signup-page";
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { EmployeeLayout } from "@/components/employee/employee-layout";

function AppRouter() {
  const { appView } = useAuth();

  switch (appView) {
    case "login":
      return <LoginPage />;
    case "signup":
      return <SignupPage />;
    case "forgot-password":
      return <ForgotPasswordPage />;
    case "reset-password":
      return <ResetPasswordPage />;
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