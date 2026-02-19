"use client";

import { useState, useRef, useEffect } from "react";
import { CSVUpload } from "@/components/csv-upload";
import { ResultsDashboard } from "@/components/results-dashboard";
import { parseCSV } from "@/lib/csv-parser";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [statusDetail, setStatusDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFileSelect = async (file: File) => {
    // Terminate any previous worker
    workerRef.current?.terminate();
    workerRef.current = null;

    setIsProcessing(true);
    setError(null);
    setStatus("Parsing CSV file...");
    setStatusDetail(`${(file.size / 1024 / 1024).toFixed(1)} MB`);

    console.log(`[App] File selected: ${file.name} (${file.size} bytes)`);

    try {
      // Small yield so the UI can update before the sync CSV parse
      await new Promise((r) => setTimeout(r, 30));

      const transactions = await parseCSV(file);

      if (transactions.length === 0) {
        throw new Error(
          "No valid transactions found in CSV. Check that your file has the required columns: transaction_id, sender_id, receiver_id, amount, timestamp"
        );
      }

      setStatus(`Loaded ${transactions.length.toLocaleString()} transactions`);
      setStatusDetail("Starting analysis engine...");
      await new Promise((r) => setTimeout(r, 50));

      // Run analysis in a Web Worker so the UI stays fully responsive
      const worker = new Worker(
        new URL("./analysis.worker.ts", import.meta.url)
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;

        if (msg.type === "progress") {
          setStatus(msg.phase);
          setStatusDetail(msg.detail || "");
        } else if (msg.type === "result") {
          const analysisResult: AnalysisResult = msg.result;

          // Re-hydrate Dates (serialised as strings through postMessage)
          for (const edge of analysisResult.graph.edges) {
            edge.timestamp = new Date(edge.timestamp);
          }
          for (const [, node] of analysisResult.graph.nodes) {
            for (const txn of node.transactions) {
              txn.timestamp = new Date(txn.timestamp);
            }
          }

          setResult(analysisResult);
          setIsProcessing(false);
          setStatus("");
          setStatusDetail("");
          worker.terminate();
          workerRef.current = null;
        } else if (msg.type === "error") {
          setError(msg.message);
          setIsProcessing(false);
          setStatus("");
          setStatusDetail("");
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.onerror = (e) => {
        setError(`Worker error: ${e.message}`);
        setIsProcessing(false);
        setStatus("");
        setStatusDetail("");
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ transactions });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      console.error(`[App] Error during processing:`, err);
      setError(message);
      setIsProcessing(false);
      setStatus("");
      setStatusDetail("");
    }
  };

  const handleReset = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setResult(null);
    setError(null);
    setStatus("");
    setStatusDetail("");
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-red-500">Money Muling</span> Detector
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Graph-based financial crime detection engine
          </p>
          <p className="text-muted-foreground/60 text-sm mt-1">
            Detects circular fund routing, smurfing patterns, and shell networks
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {result ? (
          <ResultsDashboard result={result} onReset={handleReset} />
        ) : (
          <div className="max-w-2xl mx-auto">
            <CSVUpload
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
              statusMessage={
                statusDetail ? `${status} — ${statusDetail}` : status
              }
            />

            <div className="mt-8 text-center text-sm text-muted-foreground space-y-1">
              <p>Upload a CSV file with transaction data to begin analysis.</p>
              <p>
                Supports large datasets — files with 50,000+ transactions are
                handled via stratified sampling to preserve coverage across all
                time periods.
              </p>
              <p className="text-muted-foreground/60">
                Required columns: transaction_id · sender_id · receiver_id ·
                amount · timestamp
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
