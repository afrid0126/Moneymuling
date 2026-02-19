import { DirectedGraph, ShellChain } from "./types";

const MIN_CHAIN_LENGTH = 3;
const MAX_CHAIN_LENGTH = 8;
const SHELL_MAX_TRANSACTIONS = 3;
// FIX: A "real" account that can START a chain must have meaningful activity
const REAL_ACCOUNT_MIN_TRANSACTIONS = 4;

export function detectShellNetworks(graph: DirectedGraph): ShellChain[] {
  const chains: ShellChain[] = [];
  const seen = new Set<string>();

  for (const [nodeId] of graph.adjacencyList) {
    const node = graph.nodes.get(nodeId)!;

    // FIX: Start chains only from REAL (high-activity) accounts, not shells.
    // Original code had the condition inverted (skipping nodes with few txns),
    // which meant it was exploring shells as starts, not endpoints.
    if (node.totalTransactions < REAL_ACCOUNT_MIN_TRANSACTIONS) continue;

    const path = [nodeId];
    const visited = new Set<string>([nodeId]);

    findShellChains(graph, nodeId, path, visited, chains, seen);
  }

  return chains;
}

function findShellChains(
  graph: DirectedGraph,
  current: string,
  path: string[],
  visited: Set<string>,
  chains: ShellChain[],
  seen: Set<string>
): void {
  if (path.length > MAX_CHAIN_LENGTH) return;

  const neighbors = graph.adjacencyList.get(current) || [];

  for (const neighbor of neighbors) {
    if (visited.has(neighbor)) continue;

    const neighborNode = graph.nodes.get(neighbor)!;
    const isShell = neighborNode.totalTransactions <= SHELL_MAX_TRANSACTIONS;

    path.push(neighbor);
    visited.add(neighbor);

    if (isShell) {
      // Continue extending the chain through shell nodes
      findShellChains(graph, neighbor, path, visited, chains, seen);
    } else {
      // Reached a non-shell endpoint — evaluate the chain
      const intermediaries = path.slice(1, -1);
      const shellIntermediaries = intermediaries.filter((id) => {
        const n = graph.nodes.get(id)!;
        return n.totalTransactions <= SHELL_MAX_TRANSACTIONS;
      });

      if (
        path.length >= MIN_CHAIN_LENGTH + 2 &&
        shellIntermediaries.length >= MIN_CHAIN_LENGTH
      ) {
        const key = path.join("->");
        if (!seen.has(key)) {
          seen.add(key);
          chains.push({
            chain: [...path],
            shell_accounts: shellIntermediaries,
          });
        }
      }
    }

    path.pop();
    visited.delete(neighbor);
  }
}
