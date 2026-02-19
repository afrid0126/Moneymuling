"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GraphVisualization } from "./graph-visualization";
import { FraudRingTable } from "./fraud-ring-table";
import { JSONDownload } from "./json-download";
import { AlgorithmMetrics } from "./algorithm-metrics";
import { PatternDistribution } from "./pattern-distribution";
import { AnalysisResult } from "@/lib/types";

interface ResultsDashboardProps {
  result: AnalysisResult;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const { summary } = result;

  return (
    <div className="space-y-6">
      {/* Sampling notice */}
      {summary.was_sampled && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm text-center">
          Large dataset detected: {summary.original_transaction_count.toLocaleString()} total transactions.
          Analysis ran on a stratified sample of{" "}
          {summary.total_transactions_processed.toLocaleString()} transactions,
          evenly distributed across the full time range for representative coverage.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Accounts Analyzed</p>
            <p className="text-3xl font-bold">
              {summary.total_accounts_analyzed.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Suspicious Accounts</p>
            <p className="text-3xl font-bold text-red-400">
              {summary.suspicious_accounts_flagged.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fraud Rings</p>
            <p className="text-3xl font-bold text-orange-400">
              {summary.fraud_rings_detected.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Processing Time</p>
            <p className="text-3xl font-bold">
              {summary.processing_time_seconds}s
            </p>
          </CardContent>
        </Card>
      </div>

      <AlgorithmMetrics result={result} />

      <div className="grid grid-cols-1 gap-6 items-start">
        <PatternDistribution result={result} />
      </div>

      <GraphVisualization result={result} />

      <FraudRingTable rings={result.fraud_rings} />

      <div className="flex items-center gap-4">
        <JSONDownload result={result} />
        <button
          onClick={onReset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Upload another file
        </button>
      </div>
    </div>
  );
}
