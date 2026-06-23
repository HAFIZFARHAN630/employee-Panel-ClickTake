"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff, Building2 } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError("Invalid email or password. Please try again.");
      }
      // On success, auth-context handles persistAuth(user, token) and appView routing
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email: string, pwd: string) => {
    setEmail(email);
    setPassword(pwd);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      {/* Subtle decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">EMS</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Employee Management System
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="mt-6 shadow-sm border-dashed border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-wider">
              Demo Credentials
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  fillCredentials("admin@techcorp.com", "admin123")
                }
                className="w-full text-left flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <span className="font-medium">Admin</span>
                <span className="text-xs text-muted-foreground font-mono">
                  admin@techcorp.com / admin123
                </span>
              </button>
              <Separator />
              <button
                type="button"
                onClick={() =>
                  fillCredentials("manager@techcorp.com", "manager123")
                }
                className="w-full text-left flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <span className="font-medium">Manager</span>
                <span className="text-xs text-muted-foreground font-mono">
                  manager@techcorp.com / manager123
                </span>
              </button>
              <Separator />
              <button
                type="button"
                onClick={() =>
                  fillCredentials("employee@techcorp.com", "emp123")
                }
                className="w-full text-left flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <span className="font-medium">Employee</span>
                <span className="text-xs text-muted-foreground font-mono">
                  employee@techcorp.com / emp123
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}