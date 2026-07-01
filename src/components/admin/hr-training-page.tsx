"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { HRTrainingData } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, GraduationCap, Search, Bot, Info, FlaskConical, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

// ============ HELPERS ============

function getCategoryBadge(category: string) {
  const map: Record<string, string> = {
    policy: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
    onboarding: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
    benefits: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    conduct: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    safety: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  };
  return (
    <Badge className={map[category] ?? "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"}>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </Badge>
  );
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 80) return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />{confidence}%</Badge>;
  if (confidence >= 50) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">~{confidence}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />{confidence}%</Badge>;
}

// ============ FORM TYPES ============

interface HRTrainingFormData {
  question: string;
  answer: string;
  category: string;
}

const emptyForm: HRTrainingFormData = {
  question: "",
  answer: "",
  category: "policy",
};

// ============ TEST RESULT TYPE ============

interface TestResult {
  recordId: string;
  answer: string;
  source: string;
  confidence: number;
}

// ============ COMPONENT ============

export function HRTrainingPage() {
  const [records, setRecords] = useState<HRTrainingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HRTrainingData | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<HRTrainingData | null>(null);
  const [form, setForm] = useState<HRTrainingFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Test state
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<HRTrainingData[]>("/api/hr-training");
      setRecords(data);
    } catch {
      toast.error("Failed to load HR training data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.question.toLowerCase().includes(q) ||
        r.answer.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleCreate = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (record: HRTrainingData) => {
    setEditingRecord(record);
    setForm({
      question: record.question,
      answer: record.answer,
      category: record.category,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    try {
      setSaving(true);
      if (editingRecord) {
        await api.put(`/api/hr-training/${editingRecord.id}`, form);
        toast.success("Training data updated");
      } else {
        await api.post("/api/hr-training", form);
        toast.success("Training data created");
      }
      setDialogOpen(false);
      fetchRecords();
    } catch {
      toast.error("Failed to save training data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await api.delete(`/api/hr-training/${deletingRecord.id}`);
      toast.success("Training data deleted");
      setDeleteDialogOpen(false);
      setDeletingRecord(null);
      fetchRecords();
    } catch {
      toast.error("Failed to delete training data");
    }
  };

  const handleTest = async (record: HRTrainingData) => {
    setTestingIds((prev) => new Set(prev).add(record.id));
    try {
      const result = await api.post<{ answer: string; source: string; confidence: number }>("/api/hr-chat", {
        question: record.question,
      });
      setTestResults((prev) => {
        const next = new Map(prev);
        next.set(record.id, {
          recordId: record.id,
          answer: result.answer,
          source: result.source,
          confidence: result.confidence || 0,
        });
        return next;
      });
    } catch {
      toast.error("Test failed");
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  const handleTestAll = async () => {
    for (const record of filteredRecords) {
      await handleTest(record);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">HR Training Data</h2>
            <p className="text-sm text-muted-foreground">
              Manage knowledge base for HR AI assistant
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-fit">
          <Button variant="outline" onClick={handleTestAll} disabled={loading || filteredRecords.length === 0}>
            <FlaskConical className="h-4 w-4 mr-2" />
            Test All
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Explanation Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              About This Knowledge Base
            </h3>
            <p className="text-sm text-muted-foreground">
              This knowledge base trains the HR Chatbot. Add common HR questions and answers here
              to improve the AI assistant&apos;s responses. Categories help organize entries by topic
              such as company policies, onboarding procedures, employee benefits, code of conduct,
              and safety guidelines. The more comprehensive this base is, the better the chatbot
              can assist employees with HR-related queries.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions, answers, or categories..."
          className="pl-9"
        />
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <GraduationCap className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {search ? "No matching records" : "No training data yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Try a different search term" : "Add your first Q&A entry"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Question</TableHead>
                    <TableHead className="hidden lg:table-cell">Answer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const testResult = testResults.get(record.id);
                    const isTesting = testingIds.has(record.id);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.question}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="line-clamp-2 text-sm text-muted-foreground max-w-xs">
                            {record.answer}
                          </p>
                        </TableCell>
                        <TableCell>{getCategoryBadge(record.category)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 w-fit"
                              onClick={() => handleTest(record)}
                              disabled={isTesting}
                            >
                              {isTesting ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <FlaskConical className="h-3 w-3" />
                              )}
                              Test
                            </Button>
                            {testResult && (
                              <div className="space-y-0.5">
                                {getConfidenceBadge(testResult.confidence)}
                                <p className="text-[10px] text-muted-foreground max-w-[150px] line-clamp-1">
                                  {testResult.answer}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                              aria-label="Edit entry"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingRecord(record);
                                setDeleteDialogOpen(true);
                              }}
                              aria-label="Delete entry"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Entry" : "Add Training Entry"}</DialogTitle>
            <DialogDescription>
              {editingRecord ? "Update the Q&A entry" : "Add a new question and answer for the HR knowledge base"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="training-question">Question</Label>
              <Input
                id="training-question"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="e.g., What is the leave policy?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training-answer">Answer</Label>
              <Textarea
                id="training-answer"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder="Provide a detailed answer..."
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="benefits">Benefits</SelectItem>
                  <SelectItem value="conduct">Conduct</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                editingRecord ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Q&A entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}