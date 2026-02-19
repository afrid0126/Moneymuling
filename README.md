# Money Muling Detector

## Graph-Based Financial Crime Detection Engine

RIFT 2026 Hackathon — Graph Theory / Financial Crime Detection Track
Multi-city Hackathon Submission

---

# Live Application

## Deployment

**Live URL:https://moneymuling-two.vercel.app/

The application is publicly accessible and supports CSV upload directly from the homepage as required by the challenge guidelines.

---

# Problem Overview

## Context

Money muling is a structured financial crime technique where illicit funds are transferred across intermediary accounts to obscure origin and ownership.

Traditional database queries fail to detect:

* Multi-hop transaction loops
* Coordinated fraud rings
* Temporal clustering behavior
* Layered shell account chains

This project builds a browser-based Financial Forensics Engine that models transactions as a directed graph and detects structural laundering patterns using bounded graph algorithms.

---

# Design Objectives

## System Goals

* Accept structured CSV transaction input
* Construct a directed transaction graph
* Detect multi-hop fraud rings using bounded search
* Enforce temporal validation to reduce false positives
* Avoid flagging legitimate high-volume merchants or payroll accounts
* Produce deterministic JSON output matching strict evaluation schema
* Operate fully client-side within performance constraints (≤10K transactions)

---

# Design Philosophy

## Graph-First Detection Strategy

The system treats fraud as a structural network phenomenon rather than an isolated transactional anomaly.

Core principles:

* Directed graph modeling
* Bounded depth search
* Deterministic pattern detection
* Temporal coherence validation
* Structural validation over heuristic weighting
* Strict output reproducibility

Correctness is enforced through algorithmic validation rather than probabilistic scoring.

---

# System Architecture

## High-Level Processing Pipeline

```
                    ┌──────────────────────────┐
                    │        CSV Upload        │
                    └─────────────┬────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   Client-Side Parsing   │
                    │      (CSV Processor)     │
                    └─────────────┬────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │     Graph Construction   │
                    │ (Adjacency Lists + Meta) │
                    └─────────────┬────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ Structural Pattern Engine│
                    └─────────────┬────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Cycle Detection │   │ Smurfing Pattern │   │  Shell Chain     │
│   (Bounded DFS)  │   │  Detection       │   │  Detection       │
└──────────┬───────┘   └──────────┬───────┘   └──────────┬───────┘
           │                      │                      │
           └───────────────┬──────┴──────────────┬───────┘
                           ▼                     ▼
                ┌──────────────────────────┐
                │   Fraud Ring Aggregation │
                │  (Canonical Indexing)    │
                └─────────────┬────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │        Output Layer      │
                └─────────────┬────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Interactive Graph│  │ Fraud Ring Table │  │   JSON Report    │
│  Visualization   │  │   (Structured)   │  │    Export        │
└──────────────────┘  └──────────────────┘  └──────────────────┘

```

All computation is executed within the browser runtime without server-side processing.

---

# Graph-Theoretic Detection Model

## Directed Graph Representation

* Each account is represented as a vertex
* Each transaction is represented as a directed edge (sender → receiver)
* Edge attributes include timestamp and transaction amount

Fraud detection operates on structural properties of this graph.

---

# Detection Methodology

## Circular Fund Routing (Directed Cycle Detection)

### Objective

Detect simple directed cycles of bounded length (3–5) that indicate structured laundering.

### Algorithm

* Bounded Depth-First Search (DFS)
* Canonical rotation for cycle deduplication
* Temporal validation (≤7 days)
* Amount consistency constraint (≥50% preservation per hop)

### Time Complexity

O(V × d^k)

Where:
V = number of vertices
d = average out-degree
k ≤ 5

---

## Smurfing Structures (High-Degree Aggregation)

### Objective

Detect anomalous fan-in and fan-out patterns within constrained time windows.

### Detection Logic

* Identify nodes with ≥10 unique senders (fan-in)
* Identify nodes with ≥10 unique receivers (fan-out)
* Apply 72-hour sliding temporal window
* Filter merchant/payroll-like statistical patterns

### Time Complexity

O(E) for degree analysis
O(E log E) for temporal ordering

---

## Layered Shell Networks (Low-Degree Chain Detection)

### Objective

Detect multi-hop laundering paths via low-activity intermediary accounts.

### Algorithm

* Depth-limited DFS
* Intermediate nodes constrained to ≤3 total transactions
* Chain depth capped at 8

### Time Complexity

O(V × d^L), bounded by maximum chain depth

---

# Structural Validation Model

## Convergence of Evidence

An account is flagged as suspicious if it participates in one or more structurally validated subgraphs.

Detection prioritizes:

* Structural consistency
* Temporal coherence
* Degree constraints
* Multi-hop relationship integrity

This approach minimizes false positives while preserving recall.

---

# Output Specification

## Interactive Graph Visualization

* All accounts rendered as nodes
* Directed edges represent money flow
* Fraud rings clearly highlighted
* Suspicious nodes visually distinct
* Hover/click displays account metadata

---

## Fraud Ring Summary Table

Displays:

* Ring ID
* Pattern Type
* Member Count
* Member Account IDs

---

## JSON Report Export (Exact Format)

The system generates deterministic output matching required evaluation schema:

```json
{
  "suspicious_accounts": [],
  "fraud_rings": [],
  "summary": {}
}
```

Output is:

* Canonically ordered
* Deterministically derived
* Line-by-line reproducible

---

# Input Specification

## Required CSV Structure

* transaction_id (String)
* sender_id (String)
* receiver_id (String)
* amount (Float)
* timestamp (YYYY-MM-DD HH:MM:SS)

---

# Performance Model

## Constraints

* Designed for datasets up to 10,000 transactions
* Target processing time ≤ 30 seconds
* Fully client-side execution
* No server timeouts
* No persistent storage

---

# Implementation Details

## Technology Stack

* Framework: Next.js
* Language: TypeScript
* Graph Rendering: react-force-graph-2d
* CSV Parsing: Papa Parse
* Styling: Tailwind CSS
* Deployment: Vercel-compatible static hosting

---

# Installation and Execution

## Local Development

```
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

## Production Build

```
npm run build
npm start
```

---

# Limitations

## System Constraints

* Optimized for ≤10K transactions
* DFS cycle detection may degrade on extremely dense graphs
* Shell detection relies on strict degree constraints
* No Byzantine fault tolerance
* Results reset on page reload

---

# Conclusion

Money Muling Detector applies graph theory, bounded search algorithms, and temporal validation to detect structured financial crime patterns in transaction datasets.

By emphasizing structural detection rather than heuristic scoring, the system aligns with the Graph Theory track requirements and ensures deterministic, reproducible fraud ring identification.
