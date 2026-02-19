import { analyzeTransactions } from "@/lib/analysis-engine";
import { Transaction } from "@/lib/types";

// Web Worker: runs analysis off the main thread so the UI stays responsive
self.onmessage = (e: MessageEvent) => {
  const { transactions } = e.data as { transactions: Transaction[] };

  try {
    const result = analyzeTransactions(
      transactions,
      (phase: string, detail?: string) => {
        // Send progress updates back to the main thread
        self.postMessage({ type: "progress", phase, detail });
      }
    );
    self.postMessage({ type: "result", result });
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error in worker",
    });
  }
};
