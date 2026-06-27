"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AgreementTemplate, EmployeeSignature } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Pen, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface MyAgreement {
  template: AgreementTemplate;
  signature: EmployeeSignature | null;
}

export function AgreementsPage() {
  const [agreements, setAgreements] = useState<MyAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState<MyAgreement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signatureText, setSignatureText] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchAgreements() {
      setLoading(true);
      try {
        const data = await api.get<MyAgreement[]>("/api/agreements/my");
        if (!cancelled) setAgreements(data);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAgreements();
    return () => { cancelled = true; };
  }, []);

  const openAgreement = (agreement: MyAgreement) => {
    setSelectedAgreement(agreement);
    setSignatureText("");
    setAgreed(false);
    setDialogOpen(true);
  };

  const handleSign = async () => {
    if (!selectedAgreement || !signatureText.trim() || !agreed || signing) return;
    setSigning(true);
    try {
      await api.post("/api/agreements/sign", {
        agreementTemplateId: selectedAgreement.template.id,
        signatureData: signatureText.trim(),
      });
      // Update local state
      setAgreements((prev) =>
        prev.map((a) =>
          a.template.id === selectedAgreement.template.id
            ? {
                ...a,
                signature: {
                  id: `sig-${Date.now()}`,
                  employeeId: "",
                  templateId: selectedAgreement.template.id,
                  signatureImageUrl: "",
                  ipAddress: "",
                  signedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                },
              }
            : a
        )
      );
      setDialogOpen(false);
    } catch {
      // silently fail
    } finally {
      setSigning(false);
    }
  };

  const isSigned = (agreement: MyAgreement) => !!agreement.signature;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-[#E0197A]" />
        <div>
          <h2 className="text-lg font-semibold">Agreements</h2>
          <p className="text-sm text-muted-foreground">
            View and sign agreement templates assigned to you.
          </p>
        </div>
      </div>

      {/* Agreement List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : agreements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No agreements have been assigned to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agreements.map((agreement) => {
            const signed = isSigned(agreement);
            const snippet = agreement.template.content.slice(0, 150) + (agreement.template.content.length > 150 ? "..." : "");

            return (
              <Card
                key={agreement.template.id}
                className="cursor-pointer hover:border-[#E0197A]/40 transition-colors"
                onClick={() => openAgreement(agreement)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-1">
                      {agreement.template.title}
                    </h3>
                    {signed ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Not Signed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {snippet}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Pen className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      Version {agreement.template.version}
                    </span>
                    {signed && agreement.signature && (
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        Signed {new Date(agreement.signature.signedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Agreement Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#E0197A]" />
              {selectedAgreement?.template.title}
            </DialogTitle>
            <DialogDescription>
              Version {selectedAgreement?.template.version}
            </DialogDescription>
          </DialogHeader>

          {selectedAgreement && (
            <>
              {/* Content */}
              <ScrollArea className="flex-1 min-h-0 max-h-[40vh]">
                <div className="pr-4 py-2">
                  <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedAgreement.template.content}
                  </pre>
                </div>
              </ScrollArea>

              {/* Status and Signing */}
              <div className="pt-4 border-t space-y-4">
                {isSigned(selectedAgreement) ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Agreement Signed
                      </p>
                      {selectedAgreement.signature && (
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                          Signed on {new Date(selectedAgreement.signature.signedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label
                          htmlFor="signature-text"
                          className="text-sm font-medium"
                        >
                          Type your full name as signature
                        </label>
                        <Textarea
                          id="signature-text"
                          placeholder="John Doe"
                          value={signatureText}
                          onChange={(e) => setSignatureText(e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="agree-checkbox"
                          checked={agreed}
                          onCheckedChange={(checked) => setAgreed(checked === true)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor="agree-checkbox"
                          className="text-sm text-muted-foreground leading-snug cursor-pointer"
                        >
                          I have read and agree to the terms and conditions
                          outlined in this agreement.
                        </label>
                      </div>
                    </div>
                    <Button
                      onClick={handleSign}
                      disabled={!signatureText.trim() || !agreed || signing}
                      className="w-full bg-[#E0197A] hover:bg-[#E0197A]/90 text-white"
                    >
                      {signing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Pen className="h-4 w-4 mr-2" />
                      )}
                      Sign Agreement
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}