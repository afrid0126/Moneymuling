import { DirectedGraph, SmurfingPattern, Transaction } from "./types";

const FAN_THRESHOLD = 10;
const TEMPORAL_WINDOW_MS = 72 * 60 * 60 * 1000;

export function detectSmurfing(graph: DirectedGraph): SmurfingPattern[] {
  const patterns: SmurfingPattern[] = [];

  // FIX: Track emitted (hub, type) pairs to prevent duplicate rings
  const emitted = new Set<string>();

  function pushOnce(p: SmurfingPattern) {
    const key = `${p.hub_account}:${p.type}`;
    if (emitted.has(key)) return;
    emitted.add(key);
    patterns.push(p);
  }

  for (const [nodeId, node] of graph.nodes) {
    if (node.incomingFrom.size >= FAN_THRESHOLD) {
      const incomingTxns = node.transactions.filter(
        (t) => t.receiver_id === nodeId
      );
      const temporalClusters = getTemporalClusters(incomingTxns, TEMPORAL_WINDOW_MS);

      let foundTemporal = false;
      for (const cluster of temporalClusters) {
        const uniqueSenders = new Set(cluster.map((t) => t.sender_id));
        if (uniqueSenders.size >= FAN_THRESHOLD) {
          if (!isLikelyLegitimate(node, graph, "fan_in")) {
            pushOnce({
              hub_account: nodeId,
              type: "fan_in",
              connected_accounts: Array.from(uniqueSenders),
              temporal_window_hours: 72,
            });
            foundTemporal = true;
            break; // FIX: one pattern per hub per type is enough
          }
        }
      }

      // Fallback: no temporal cluster found but overall fan-in is high
      if (!foundTemporal && !isLikelyLegitimate(node, graph, "fan_in")) {
        pushOnce({
          hub_account: nodeId,
          type: "fan_in",
          connected_accounts: Array.from(node.incomingFrom),
          temporal_window_hours: -1,
        });
      }
    }

    if (node.outgoingTo.size >= FAN_THRESHOLD) {
      const outgoingTxns = node.transactions.filter(
        (t) => t.sender_id === nodeId
      );
      const temporalClusters = getTemporalClusters(outgoingTxns, TEMPORAL_WINDOW_MS);

      let foundTemporal = false;
      for (const cluster of temporalClusters) {
        const uniqueReceivers = new Set(cluster.map((t) => t.receiver_id));
        if (uniqueReceivers.size >= FAN_THRESHOLD) {
          if (!isLikelyLegitimate(node, graph, "fan_out")) {
            pushOnce({
              hub_account: nodeId,
              type: "fan_out",
              connected_accounts: Array.from(uniqueReceivers),
              temporal_window_hours: 72,
            });
            foundTemporal = true;
            break; // FIX: one pattern per hub per type
          }
        }
      }

      if (!foundTemporal && !isLikelyLegitimate(node, graph, "fan_out")) {
        pushOnce({
          hub_account: nodeId,
          type: "fan_out",
          connected_accounts: Array.from(node.outgoingTo),
          temporal_window_hours: -1,
        });
      }
    }
  }

  return patterns;
}

function getTemporalClusters(
  transactions: Transaction[],
  windowMs: number
): Transaction[][] {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const clusters: Transaction[][] = [];

  let i = 0;
  while (i < sorted.length) {
    const cluster: Transaction[] = [sorted[i]];
    const windowEnd = sorted[i].timestamp.getTime() + windowMs;

    let j = i + 1;
    while (j < sorted.length && sorted[j].timestamp.getTime() <= windowEnd) {
      cluster.push(sorted[j]);
      j++;
    }

    if (cluster.length >= FAN_THRESHOLD) {
      clusters.push(cluster);
    }

    // FIX: advance fully past the current cluster to avoid overlapping windows
    i = j;
  }

  return clusters;
}

function isLikelyLegitimate(
  node: ReturnType<typeof Object>,
  _graph: DirectedGraph,
  type: "fan_in" | "fan_out"
): boolean {
  const n = node as any;

  if (type === "fan_in") {
    const sendRatio = n.outDegree / Math.max(n.inDegree, 1);
    if (sendRatio < 0.05) {
      const amounts = n.transactions
        .filter((t: Transaction) => t.receiver_id === n.id)
        .map((t: Transaction) => t.amount);
      if (hasUniformAmounts(amounts)) return true;
    }
  }

  if (type === "fan_out") {
    const receiveRatio = n.inDegree / Math.max(n.outDegree, 1);
    if (receiveRatio < 0.05) {
      const amounts = n.transactions
        .filter((t: Transaction) => t.sender_id === n.id)
        .map((t: Transaction) => t.amount);
      if (hasUniformAmounts(amounts) && amounts.length > 20) return true;
    }
  }

  return false;
}

function hasUniformAmounts(amounts: number[]): boolean {
  if (amounts.length < 5) return false;

  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return false;

  const variance =
    amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    amounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  return cv < 0.1;
}
