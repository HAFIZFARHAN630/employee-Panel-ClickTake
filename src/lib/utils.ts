import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProjectStatus, ProjectPriority, UserType } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============ SHARED UTILITIES ============

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    archived: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

export function getPriorityColor(priority: ProjectPriority): string {
  const map: Record<ProjectPriority, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };
  return map[priority] || "bg-gray-100 text-gray-700";
}

export function getUserTypeColor(type: UserType): string {
  const map: Record<UserType, string> = {
    super_admin: "bg-red-100 text-red-700 border-red-200",
    admin: "bg-orange-100 text-orange-700 border-orange-200",
    manager: "bg-blue-100 text-blue-700 border-blue-200",
    editor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    viewer: "bg-gray-100 text-gray-700 border-gray-200",
    employee: "bg-green-100 text-green-700 border-green-200",
    freelancer: "bg-purple-100 text-purple-700 border-purple-200",
    client: "bg-pink-100 text-pink-700 border-pink-200",
  };
  return map[type] || "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
