"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResult } from "@/lib/types";
import { Activity, Clock, Search } from "lucide-react";

export function AlgorithmMetrics({ result }: { result: AnalysisResult }) {
    const { algorithm_metrics } = result.summary;

    const V = result.graph.nodes.size;
    const E = result.graph.edges.length;

    if (!algorithm_metrics) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Algorithm Performance Metrics
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1 p-3 bg-card border rounded-lg shadow-sm font-medium">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Cycle Detection
                    </span>
                    <span className="text-xl text-primary font-bold">
                        O(V³) = O({V}³)
                    </span>
                    <span className="text-[10px] text-muted-foreground">DFS-based traversal</span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-card border rounded-lg shadow-sm font-medium">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Smurfing Analysis
                    </span>
                    <span className="text-xl text-primary font-bold">
                        O(V + E) = O({(V + E).toLocaleString()})
                    </span>
                    <span className="text-[10px] text-muted-foreground">Graph traversal + temporal</span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-card border rounded-lg shadow-sm font-medium">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Shell Detection
                    </span>
                    <span className="text-xl text-primary font-bold">
                        O(V × E) = O({(V * E).toLocaleString()})
                    </span>
                    <span className="text-[10px] text-muted-foreground">Multi-hop chain analysis</span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-card border rounded-lg shadow-sm font-medium">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        Detection Rate
                    </span>
                    <span className="text-xl text-primary font-bold">
                        {algorithm_metrics.detection_rate_percent}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">Flagged accounts</span>
                </div>
            </CardContent>
        </Card>
    );
}
