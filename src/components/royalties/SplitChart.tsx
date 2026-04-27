"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"];

interface Split {
  id: string;
  name: string;
  role: string;
  percentage: number;
}

interface SplitChartProps {
  splits: Split[];
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: Split }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-muted-foreground">{data.payload.role}</p>
        <p className="text-primary font-bold mt-1">{data.value}%</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: { payload?: { value: string; color: string }[] }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {payload?.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SplitChart({ splits }: SplitChartProps) {
  const data = splits.map((s) => ({ ...s, value: s.percentage }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Répartition des droits
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                opacity={0.9}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <text
            x="50%"
            y="44%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
            style={{ fill: "hsl(210 40% 96%)", fontSize: "22px", fontWeight: "700" }}
          >
            {splits.reduce((a, s) => a + s.percentage, 0)}%
          </text>
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: "hsl(215 20% 52%)", fontSize: "11px" }}
          >
            total
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
