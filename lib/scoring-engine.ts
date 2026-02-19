import {
  DirectedGraph,
  DetectedCycle,
  SmurfingPattern,
  ShellChain,
  SuspiciousAccount,
  FraudRing,
} from "./types";

interface AccountScore {
  account_id: string;
  baseScore: number;
  patterns: string[];
  ringIdSet: Set<string>;   // O(1) lookup for dedup
  ringIds: string[];
}

export function computeScores(
  graph: DirectedGraph,
  cycles: DetectedCycle[],
  smurfingPatterns: SmurfingPattern[],
  shellChains: ShellChain[]
): { suspiciousAccounts: SuspiciousAccount[]; fraudRings: FraudRing[] } {
  const accountScores = new Map<string, AccountScore>();
  const fraudRings: FraudRing[] = [];
  let ringCounter = 1;

  function getOrCreate(id: string): AccountScore {
    if (!accountScores.has(id)) {
      accountScores.set(id, {
        account_id: id,
        baseScore: 0,
        patterns: [],
        ringIdSet: new Set(),
        ringIds: [],
      });
    }
    return accountScores.get(id)!;
  }

  // O(1) ring dedup using Set
  function addToRing(score: AccountScore, ringId: string) {
    if (!score.ringIdSet.has(ringId)) {
      score.ringIdSet.add(ringId);
      score.ringIds.push(ringId);
    }
  }

  // --- Cycles ---
  for (const cycle of cycles) {
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;
    ringCounter++;

    const cycleLengthBonus =
      cycle.length === 3 ? 45 : cycle.length === 4 ? 40 : 35;

    for (const accountId of cycle.accounts) {
      const score = getOrCreate(accountId);
      score.baseScore += cycleLengthBonus;
      score.patterns.push(`cycle_length_${cycle.length}`);
      addToRing(score, ringId);
    }

    fraudRings.push({
      ring_id: ringId,
      member_accounts: [...cycle.accounts],
      pattern_type: "cycle",
      risk_score: Math.min(100, Math.round((cycleLengthBonus + 30 + (cycle.length === 3 ? 20 : 10)) * 10) / 10),
    });
  }

  // --- Smurfing ---
  for (const pattern of smurfingPatterns) {
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;
    ringCounter++;

    const hubScore = getOrCreate(pattern.hub_account);
    hubScore.baseScore += 35;
    hubScore.patterns.push(pattern.type === "fan_in" ? "fan_in_hub" : "fan_out_hub");
    if (pattern.temporal_window_hours > 0) {
      hubScore.baseScore += 15;
      if (!hubScore.patterns.includes("high_velocity")) {
        hubScore.patterns.push("high_velocity");
      }
    }
    addToRing(hubScore, ringId);

    for (const accountId of pattern.connected_accounts) {
      const score = getOrCreate(accountId);
      score.baseScore += 15;
      score.patterns.push(
        pattern.type === "fan_in" ? "smurfing_sender" : "smurfing_receiver"
      );
      addToRing(score, ringId);
    }

    fraudRings.push({
      ring_id: ringId,
      member_accounts: [pattern.hub_account, ...pattern.connected_accounts],
      pattern_type: pattern.type,
      risk_score: pattern.temporal_window_hours > 0 ? 85 : 70,
    });
  }

  // --- Shell Networks ---
  for (const chain of shellChains) {
    const ringId = `RING_${String(ringCounter).padStart(3, "0")}`;
    ringCounter++;

    for (const shellId of chain.shell_accounts) {
      const score = getOrCreate(shellId);
      score.baseScore += 30;
      score.patterns.push("shell_intermediary");
      addToRing(score, ringId);
    }

    const endpoints = [chain.chain[0], chain.chain[chain.chain.length - 1]];
    for (const endId of endpoints) {
      const score = getOrCreate(endId);
      score.baseScore += 20;
      score.patterns.push("shell_network_endpoint");
      addToRing(score, ringId);
    }

    fraudRings.push({
      ring_id: ringId,
      member_accounts: [...chain.chain],
      pattern_type: "shell_network",
      risk_score: 75,
    });
  }

  // --- Velocity & Amount anomaly bonuses ---
  for (const [accountId, node] of graph.nodes) {
    if (!accountScores.has(accountId)) continue;
    const score = accountScores.get(accountId)!;
    const txns = node.transactions;

    if (txns.length >= 2) {
      const sorted = [...txns].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      const timeSpanHours =
        (sorted[sorted.length - 1].timestamp.getTime() -
          sorted[0].timestamp.getTime()) / (1000 * 60 * 60);

      if (timeSpanHours > 0 && txns.length / timeSpanHours > 2) {
        if (!score.patterns.includes("high_velocity")) {
          score.baseScore += 10;
          score.patterns.push("high_velocity");
        }
      }
    }

    const hasAmountAnomaly = node.transactions.some((t) => {
      const amt = t.amount;
      return (amt >= 1000 && amt % 1000 === 0) ||
        (amt >= 9900 && amt < 10000) ||
        (amt >= 4900 && amt < 5000);
    });
    if (hasAmountAnomaly && !score.patterns.includes("amount_anomaly")) {
      score.baseScore += 5;
      score.patterns.push("amount_anomaly");
    }
  }

  // --- Final scoring ---
  const suspiciousAccounts: SuspiciousAccount[] = [];

  for (const [, score] of accountScores) {
    const uniquePatternTypes = new Set(
      score.patterns.map((p) => {
        if (p.startsWith("cycle")) return "cycle";
        if (p.includes("fan_") || p.includes("smurfing")) return "smurfing";
        if (p.includes("shell")) return "shell";
        return p;
      })
    );

    let finalScore = score.baseScore;
    if (uniquePatternTypes.size >= 2) finalScore *= 1.3;

    finalScore = Math.min(100, Math.round(finalScore * 10) / 10);

    const uniqueRingIds = [...score.ringIdSet];

    suspiciousAccounts.push({
      account_id: score.account_id,
      suspicion_score: finalScore,
      detected_patterns: [...new Set(score.patterns)],
      ring_id: uniqueRingIds[0] || "",
      ring_ids: uniqueRingIds,
    });
  }

  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score);
  return { suspiciousAccounts, fraudRings };
}
