"use client";

import { useTheme } from "@/lib/theme-context";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 rounded-lg"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 text-muted-foreground theme-icon-sun" />
      <Moon className="h-4 w-4 text-muted-foreground theme-icon-moon" />
    </Button>
  );
}