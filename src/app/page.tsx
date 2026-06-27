"use client";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginPage } from "@/components/auth/login-page";
import { SignupPage } from "@/components/auth/signup-page";
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { EmployeeLayout } from "@/components/employee/employee-layout";
import { Loader2 } from "lucide-react";

function AppRouter() {
  const { appView, hydrating } = useAuth();

  // Show a full-screen loader while restoring session from localStorage
  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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