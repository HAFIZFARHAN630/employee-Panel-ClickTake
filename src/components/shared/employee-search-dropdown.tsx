"use client";

import * as React from "react";
import { X, Check, Loader2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface EmployeeSearchDropdownProps {
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}



export function EmployeeSearchDropdown({
  value,
  onChange,
  placeholder = "Select employee...",
  disabled = false,
}: EmployeeSearchDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve selected user on mount and when value changes
  React.useEffect(() => {
    if (!value) {
      setSelectedUser(null);
      return;
    }
    // If we already have the user in our list, use it
    const existing = users.find((u) => u.id === value);
    if (existing) {
      setSelectedUser(existing);
      return;
    }
    // Otherwise fetch just the selected user by ID
    let cancelled = false;
    api
      .get<User>(`/api/users/${value}`)
      .then((res) => {
        if (!cancelled) {
          setSelectedUser(res);
        }
      })
      .catch(() => {
        // silently ignore
      });
    return () => {
      cancelled = true;
    };
  }, [value, users]);

  // Fetch users on mount and when popover opens
  const fetchUsers = React.useCallback((search: string) => {
    setLoading(true);
    api
      .get<{ users: User[] }>("/api/users", {
        limit: "200",
        search,
      })
      .then((res) => {
        setUsers(res.users ?? []);
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Initial fetch when popover opens (only on open change, not query)
  React.useEffect(() => {
    if (open) {
      fetchUsers("");
      setQuery("");
    }
  }, [open, fetchUsers]);

  // Debounced search
  const handleSearch = React.useCallback(
    (val: string) => {
      setQuery(val);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchUsers(val);
      }, 300);
    },
    [fetchUsers]
  );

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelect = React.useCallback(
    (userId: string) => {
      onChange(userId);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setSelectedUser(null);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 text-left font-normal",
            !selectedUser && "text-muted-foreground"
          )}
        >
          {selectedUser ? (
            <span className="flex items-center gap-2 min-w-0 truncate">
              <Avatar className="size-5 shrink-0">
                <AvatarImage
                  src={selectedUser.avatarUrl ?? undefined}
                  alt={selectedUser.fullName}
                />
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-[#E0197A] to-[#7B2FBE] text-white">
                  {getInitials(selectedUser.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.fullName}</span>
            </span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          {selectedUser && (
            <X
              className="ml-2 size-3.5 shrink-0 opacity-70 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search employees..."
            value={query}
            onValueChange={handleSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : query ? (
                "No employees found."
              ) : (
                "Start typing to search..."
              )}
            </CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => handleSelect(user.id)}
                  className="flex items-center gap-3 py-2.5 cursor-pointer"
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage
                      src={user.avatarUrl ?? undefined}
                      alt={user.fullName}
                    />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-[#E0197A] to-[#7B2FBE] text-white">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">
                      {user.fullName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                    {user.employee?.department && (
                      <span className="text-xs text-muted-foreground truncate">
                        {user.employee.department}
                      </span>
                    )}
                  </div>
                  {value === user.id && (
                    <Check className="size-4 shrink-0 text-[#E0197A]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}