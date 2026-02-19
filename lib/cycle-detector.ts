import { DirectedGraph, DetectedCycle, GraphEdge } from "./types";

const MAX_CYCLE_LENGTH = 5;
const MIN_CYCLE_LENGTH = 3;
const MAX_CYCLES_PER_START = 30;
const MAX_TOTAL_CYCLES = 2000;

const AMOUNT_DECAY_THRESHOLD = 0.5;
const TEMPORAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function detectCycles(graph: DirectedGraph): DetectedCycle[] {
  const rawCycles: string[][] = [];
  const seen = new Set<string>();

  // Only nodes that can actually participate in a cycle (need both in and out edges)
  const allNodes = Array.from(graph.adjacencyList.keys()).filter((id) => {
    const node = graph.nodes.get(id);
    return node && node.inDegree > 0 && node.outDegree > 0;
  });

  console.log(
    `[Cycle Detector] Eligible nodes: ${allNodes.length} of ${graph.nodes.size}`
  );

  // globalExplored prevents re-entering already-exhausted start nodes
  const globalExplored = new Set<string>();

  for (const startNode of allNodes) {
    if (globalExplored.has(startNode)) continue;
    if (rawCycles.length >= MAX_TOTAL_CYCLES) break;

    const before = rawCycles.length;
    dfs(
      startNode,
      startNode,
      [startNode],
      new Set<string>([startNode]),
      graph,
      rawCycles,
      seen,
      before + MAX_CYCLES_PER_START
    );
    globalExplored.add(startNode);
  }

  console.log(`[Cycle Detector] Raw cycles found: ${rawCycles.length}`);

  // *** FIX: Build edgeMap ONCE here, pass into validator — never rebuild per cycle ***
  const edgesByPair = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!edgesByPair.has(key)) edgesByPair.set(key, []);
    edgesByPair.get(key)!.push(edge);
  }

  const validated: DetectedCycle[] = [];
  for (const cycle of rawCycles) {
    if (isSuspiciousCycle(cycle, edgesByPair)) {
      validated.push({ accounts: cycle, length: cycle.length });
    }
  }

  console.log(`[Cycle Detector] Validated suspicious cycles: ${validated.length}`);
  return validated;
}

function dfs(
  current: string,
  start: string,
  path: string[],
  visited: Set<string>,
  graph: DirectedGraph,
  cycles: string[][],
  seen: Set<string>,
  maxCycles: number
): void {
  if (cycles.length >= maxCycles) return;

  const neighbors = graph.adjacencyList.get(current) || [];

  for (const neighbor of neighbors) {
    if (cycles.length >= maxCycles) return;

    if (
      neighbor === start &&
      path.length >= MIN_CYCLE_LENGTH &&
      path.length <= MAX_CYCLE_LENGTH
    ) {
      const canonical = getCanonicalForm(path);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        cycles.push([...path]);
      }
      continue;
    }

    if (!visited.has(neighbor) && path.length < MAX_CYCLE_LENGTH) {
      visited.add(neighbor);
      path.push(neighbor);
      dfs(neighbor, start, path, visited, graph, cycles, seen, maxCycles);
      path.pop();
      visited.delete(neighbor);
    }
  }
}

// *** FIX: Accepts pre-built edgesByPair — no longer rebuilds on every call ***
function isSuspiciousCycle(
  cycle: string[],
  edgesByPair: Map<string, GraphEdge[]>
): boolean {
  const hopEdges: GraphEdge[] = [];

  for (let i = 0; i < cycle.length; i++) {
    const from = cycle[i];
    const to = cycle[(i + 1) % cycle.length];
    const candidates = edgesByPair.get(`${from}->${to}`);

    if (!candidates || candidates.length === 0) return false;

    // Best (highest amount) edge for this hop
    const best = candidates.reduce((a, b) => (a.amount > b.amount ? a : b));
    hopEdges.push(best);
  }

  // Amount decay check
  for (let i = 1; i < hopEdges.length; i++) {
    const prev = hopEdges[i - 1].amount;
    const curr = hopEdges[i].amount;
    if (prev > 0 && curr / prev < AMOUNT_DECAY_THRESHOLD) return false;
  }

  const lastAmount = hopEdges[hopEdges.length - 1].amount;
  const firstAmount = hopEdges[0].amount;
  if (firstAmount > 0 && lastAmount / firstAmount < AMOUNT_DECAY_THRESHOLD) {
    return false;
  }

  // Temporal window check
  const timestamps = hopEdges.map((e) => e.timestamp.getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  return maxTime - minTime <= TEMPORAL_WINDOW_MS;
}

function getCanonicalForm(cycle: string[]): string {
  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[minIdx]) minIdx = i;
  }
  return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)].join("->");
}
