"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResult } from "@/lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

const PATTERN_COLORS: Record<string, string> = {
    cycle: "#3b82f6", // blue
    fan_in: "#f59e0b", // amber
    fan_out: "#10b981", // emerald
    smurfing: "#8b5cf6", // purple
    shell_network: "#ef4444", // red
};

const PATTERN_LABELS: Record<string, string> = {
    cycle: "Cycles",
    fan_in: "Smurfing Fan In",
    fan_out: "Smurfing Fan Out",
    smurfing: "Complex Smurfing",
    shell_network: "Shell Networks",
};

export function PatternDistribution({ result }: { result: AnalysisResult }) {
    const data = useMemo(() => {
        const counts: Record<string, number> = {
            cycle: 0,
            fan_in: 0,
            fan_out: 0,
            smurfing: 0,
            shell_network: 0,
        };

        result.fraud_rings.forEach((ring) => {
            if (counts[ring.pattern_type] !== undefined) {
                counts[ring.pattern_type]++;
            } else {
                counts[ring.pattern_type] = 1;
            }
        });

        return Object.entries(counts)
            .filter(([, count]) => count > 0)
            .map(([key, count]) => ({
                name: PATTERN_LABELS[key] || key,
                value: count,
                color: PATTERN_COLORS[key] || "#8884d8",
            }));
    }, [result.fraud_rings]);

    if (data.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-purple-500" />
                    Pattern Distribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number | undefined) => [
                                        value ?? 0,
                                        "Rings Detected",
                                    ]}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                    itemStyle={{ color: "hsl(var(--foreground))" }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                            <thead className="bg-muted text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Pattern Type</th>
                                    <th className="px-4 py-3 font-medium text-right">
                                        Count
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.map((item, i) => (
                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            {item.name}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {item.value.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
