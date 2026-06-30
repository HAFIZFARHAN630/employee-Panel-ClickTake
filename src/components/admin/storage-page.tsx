"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { VerificationRecord, AgreementTemplate, Asset } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HardDrive,
  Video,
  FileSignature,
  Package,
  Users,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// ============ STAT CARD ============

interface StorageStatProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  color: string;
  loading: boolean;
}

function StorageStatCard({ title, value, icon: Icon, description, color, loading }: StorageStatProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============

export function StoragePage() {
  const { setAdminPage } = useAuth();

  const [verificationCount, setVerificationCount] = useState(0);
  const [agreementCount, setAgreementCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [signatureTotal, setSignatureTotal] = useState(0);

  const [loadingVerifications, setLoadingVerifications] = useState(true);
  const [loadingAgreements, setLoadingAgreements] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const fetchVerifications = useCallback(async () => {
    try {
      setLoadingVerifications(true);
      const data = await api.get<VerificationRecord[]>("/api/verification");
      setVerificationCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setVerificationCount(0);
    } finally {
      setLoadingVerifications(false);
    }
  }, []);

  const fetchAgreements = useCallback(async () => {
    try {
      setLoadingAgreements(true);
      const data = await api.get<(AgreementTemplate & { _count?: { signatures: number } })[]>("/api/agreements");
      if (Array.isArray(data)) {
        setAgreementCount(data.length);
        const totalSigs = data.reduce((sum, t) => sum + (t._count?.signatures ?? 0), 0);
        setSignatureTotal(totalSigs);
      }
    } catch {
      setAgreementCount(0);
      setSignatureTotal(0);
    } finally {
      setLoadingAgreements(false);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      setLoadingAssets(true);
      const data = await api.get<Asset[]>("/api/assets");
      setAssetCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setAssetCount(0);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
    fetchAgreements();
    fetchAssets();
  }, [fetchVerifications, fetchAgreements, fetchAssets]);

  const allLoading = loadingVerifications && loadingAgreements && loadingAssets;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <HardDrive className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Storage Management</h2>
          <p className="text-sm text-muted-foreground">
            Overview of stored data across the system
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StorageStatCard
          title="Verification Videos"
          value={verificationCount}
          icon={Video}
          description="Face verification submissions"
          color="bg-red-100 text-red-600"
          loading={loadingVerifications}
        />
        <StorageStatCard
          title="Agreement Templates"
          value={agreementCount}
          icon={FileSignature}
          description="Active policy templates"
          color="bg-green-100 text-green-600"
          loading={loadingAgreements}
        />
        <StorageStatCard
          title="Signatures Collected"
          value={signatureTotal}
          icon={FileSignature}
          description="Total employee signatures"
          color="bg-purple-100 text-purple-600"
          loading={loadingAgreements}
        />
        <StorageStatCard
          title="Company Assets"
          value={assetCount}
          icon={Package}
          description="Tracked inventory items"
          color="bg-amber-100 text-amber-600"
          loading={loadingAssets}
        />
      </div>

      {allLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-20 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Detail Cards */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verification Detail */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-4 w-4 text-red-500" />
                  Verifications
                </CardTitle>
              </div>
              <CardDescription>Face verification records submitted by employees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-bold">{verificationCount}</p>
              <p className="text-sm text-muted-foreground">
                {verificationCount === 0
                  ? "No verification records yet"
                  : `${verificationCount} record${verificationCount !== 1 ? "s" : ""} in the system`}
              </p>
              <button
                onClick={() => setAdminPage("verification")}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>

          {/* Agreements Detail */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-green-500" />
                  Agreements
                </CardTitle>
              </div>
              <CardDescription>Policy templates and employee signatures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{agreementCount}</p>
                <span className="text-sm text-muted-foreground">templates</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{signatureTotal}</p>
                <span className="text-sm text-muted-foreground">signatures</span>
              </div>
              <button
                onClick={() => setAdminPage("agreements")}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>

          {/* Assets Detail */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" />
                  Assets
                </CardTitle>
              </div>
              <CardDescription>Company assets and equipment tracked in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-bold">{assetCount}</p>
              <p className="text-sm text-muted-foreground">
                {assetCount === 0
                  ? "No assets tracked yet"
                  : `${assetCount} asset${assetCount !== 1 ? "s" : ""} registered`}
              </p>
              <button
                onClick={() => setAdminPage("assets")}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}