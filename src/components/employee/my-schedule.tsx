"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Shift } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Loader2 } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
  eachDayOfInterval,
} from "date-fns";

export function MySchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchShifts() {
      setLoading(true);
      try {
        const data = await api.get<Shift[]>("/api/shifts", { my: "true" });
        if (!cancelled) setShifts(Array.isArray(data) ? data : []);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchShifts();
    return () => { cancelled = true; };
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const today = new Date();

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => {
      try {
        const shiftDate = new Date(shift.startTime);
        return isSameDay(shiftDate, day);
      } catch {
        return false;
      }
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handlePrevWeek = () => {
    setCurrentDate((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-[#E0197A]" />
          <div>
            <h2 className="text-lg font-semibold">Weekly Schedule</h2>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                className={`rounded-lg border p-2 min-h-[120px] flex flex-col ${
                  isToday
                    ? "border-[#E0197A] bg-[#E0197A]/5"
                    : isWeekend
                    ? "bg-muted/30"
                    : "bg-card"
                }`}
              >
                {/* Day header */}
                <div className="text-center mb-2">
                  <p
                    className={`text-[10px] uppercase font-medium tracking-wider ${
                      isToday ? "text-[#E0197A]" : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={`text-lg font-bold leading-tight ${
                      isToday ? "text-[#E0197A]" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </p>
                  {isToday && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E0197A] mx-auto mt-1" />
                  )}
                </div>

                {/* Shifts */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-48">
                  {dayShifts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      No shifts
                    </p>
                  )}
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="rounded-md bg-gradient-to-r from-[#E0197A]/10 to-[#7B2FBE]/10 border border-[#E0197A]/20 p-1.5"
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">
                        {shift.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0 h-4 mt-1"
                      >
                        {shift.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state for all shifts */}
      {!loading && shifts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No shifts scheduled for you yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}