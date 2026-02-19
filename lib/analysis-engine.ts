import { Transaction, AnalysisResult, ProgressCallback } from "./types";
import { buildGraph } from "./graph-builder";
import { detectCycles } from "./cycle-detector";
import { detectSmurfing } from "./smurfing-detector";
import { detectShellNetworks } from "./shell-detector";
import { computeScores } from "./scoring-engine";

const MAX_TRANSACTIONS = 50000; // increased from 10000

/**
 * Stratified sample: picks N evenly-spaced rows from a sorted array.
 * This preserves coverage across all time periods unlike a hard slice.
 */
function stratifiedSample(
  transactions: Transaction[],
  maxCount: number
): Transaction[] {
  if (transactions.length <= maxCount) return transactions;

  // Sort by timestamp to ensure representative sampling across time
  const sorted = [...transactions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const step = sorted.length / maxCount;
  const sampled: Transaction[] = [];
  for (let i = 0; i < maxCount; i++) {
    sampled.push(sorted[Math.floor(i * step)]);
  }
  return sampled;
}

export function analyzeTransactions(
  transactions: Transaction[],
  onProgress?: ProgressCallback
): AnalysisResult {
  const startTime = performance.now();
  const originalCount = transactions.length;
  let wasSampled = false;

  console.log(
    `[Analysis] Starting analysis of ${transactions.length} transactions...`
  );

  // FIX: Stratified sampling instead of hard slice
  if (transactions.length > MAX_TRANSACTIONS) {
    console.warn(
      `[Analysis] Dataset too large (${transactions.length}), stratified sampling to ${MAX_TRANSACTIONS}`
    );
    transactions = stratifiedSample(transactions, MAX_TRANSACTIONS);
    wasSampled = true;
    console.log(
      `[Analysis] Sampled ${transactions.length} transactions across entire time range`
    );
  }

  onProgress?.("Building transaction graph...");
  const graph = buildGraph(transactions);
  console.log(
    `[Analysis] Graph built: ${graph.nodes.size} nodes, ${graph.edges.length} edges`
  );

  onProgress?.("Detecting circular fund routing (cycles)...", `${graph.nodes.size} accounts`);
  const t1 = performance.now();
  const cycles = detectCycles(graph);
  console.log(
    `[Analysis] Cycle detector done: ${cycles.length} cycles found (${((performance.now() - t1) / 1000).toFixed(2)}s)`
  );

  onProgress?.("Detecting smurfing patterns (fan-in/fan-out)...", `${cycles.length} cycles found`);
  const t2 = performance.now();
  const smurfingPatterns = detectSmurfing(graph);
  console.log(
    `[Analysis] Smurfing detector done: ${smurfingPatterns.length} patterns found (${((performance.now() - t2) / 1000).toFixed(2)}s)`
  );

  onProgress?.("Detecting shell networks...", `${smurfingPatterns.length} smurfing patterns found`);
  const t3 = performance.now();
  const shellChains = detectShellNetworks(graph);
  console.log(
    `[Analysis] Shell detector done: ${shellChains.length} chains found (${((performance.now() - t3) / 1000).toFixed(2)}s)`
  );

  onProgress?.("Computing suspicion scores...");
  const { suspiciousAccounts, fraudRings } = computeScores(
    graph,
    cycles,
    smurfingPatterns,
    shellChains
  );

  const endTime = performance.now();
  const processingTime = Math.round(((endTime - startTime) / 1000) * 10) / 10;

  console.log(`[Analysis] === RESULTS ===`);
  console.log(`[Analysis] Total accounts: ${graph.nodes.size}`);
  console.log(`[Analysis] Suspicious accounts: ${suspiciousAccounts.length}`);
  console.log(`[Analysis] Fraud rings: ${fraudRings.length}`);
  console.log(`[Analysis] Processing time: ${processingTime}s`);

  onProgress?.("Analysis complete!");

  return {
    suspicious_accounts: suspiciousAccounts,
    fraud_rings: fraudRings,
    summary: {
      total_accounts_analyzed: graph.nodes.size,
      suspicious_accounts_flagged: suspiciousAccounts.length,
      fraud_rings_detected: fraudRings.length,
      processing_time_seconds: processingTime,
      total_transactions_processed: transactions.length,
      was_sampled: wasSampled,
      original_transaction_count: originalCount,
    },
    graph,
  };
}
