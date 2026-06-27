"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStoredAuth } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanFace, Camera, Upload, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export function KYCVerificationPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show popup if user is employee and not face verified
  React.useEffect(() => {
    if (user?.userType === "employee" && !user.isFaceVerified) {
      // Delay slightly to not block initial render
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.userType, user?.isFaceVerified]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file for face verification");
      return;
    }

    try {
      setUploading(true);
      setStatus("uploading");

      const formData = new FormData();
      formData.append("video", file);

      const stored = getStoredAuth();
      const token = stored?.token || "";

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setStatus("success");
        toast.success("Verification submitted! Admin will review it.");
      } else {
        setStatus("error");
        toast.error("Failed to submit verification");
      }
    } catch {
      setStatus("error");
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
    toast.info("You can complete verification later from your profile.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && status !== "uploading") setOpen(v); }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" />
            Face Verification Required
          </DialogTitle>
          <DialogDescription>
            Please complete face verification to access all features. Upload a short video of your face for identity verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {status === "idle" && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload a short video (5-10 seconds) looking directly at the camera
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                capture="user"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </div>
          )}

          {status === "uploading" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading verification video...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">Verification submitted successfully!</p>
              <p className="text-xs text-muted-foreground">An admin will review your verification shortly.</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-muted-foreground">Upload failed. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); }}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "idle" && (
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          )}
          {status === "success" && (
            <Button onClick={() => setOpen(false)}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}