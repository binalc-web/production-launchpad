import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQaRate } from "@/pages/QaAnalytics/qaAnalyticsDisplay.js";
import {
  buildFeatureUsageChartData,
  buildFunnelChartData,
  QA_CHART_COLORS,
  qaChartSeriesColor,
} from "@/pages/QaAnalytics/qaAnalyticsChartData.js";
import { QaAnalyticsTruncatedText } from "@/pages/QaAnalytics/components/QaAnalyticsTruncatedText.jsx";

const funnelChartConfig = {
  uniqueUsers: { label: "Unique users", color: QA_CHART_COLORS.runs },
};

const featureChartConfig = {
  count: { label: "Events", color: QA_CHART_COLORS.feature },
};

/**
 * @param {{ funnel?: object[] }} props
 */
export function QaAnalyticsAdoptionFunnel({ funnel = [] }) {
  const chartData = buildFunnelChartData(funnel);

  if (funnel.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adoption funnel</CardTitle>
          <CardDescription>
            <QaAnalyticsTruncatedText lineClamp={2} text="No funnel data in this period." />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adoption funnel</CardTitle>
        <CardDescription>
          <QaAnalyticsTruncatedText
            lineClamp={2}
            text="Unique-user ordered funnel. Feature usage distribution is shown separately."
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ChartContainer config={funnelChartConfig} className="h-[280px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="stage"
              tickLine={false}
              axisLine={false}
              width={168}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    if (name === "uniqueUsers") {
                      if (item?.payload?.unavailable) return "Unavailable";
                      return `${value} users`;
                    }
                    return String(value);
                  }}
                />
              }
            />
            <Bar dataKey="uniqueUsers" radius={[0, 4, 4, 0]} barSize={16}>
              {chartData.map((row) => (
                <Cell key={row.stage} fill={row.fill} fillOpacity={row.unavailable ? 0.35 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Unique users</TableHead>
                <TableHead className="text-right">From prior</TableHead>
                <TableHead className="text-right">From first</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnel.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="font-medium">{stage.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {stage.unavailable ? "Unavailable" : (stage.uniqueUsers ?? "—")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {stage.conversionFromPrior != null
                      ? formatQaRate(stage.conversionFromPrior)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {stage.conversionFromFirst != null
                      ? formatQaRate(stage.conversionFromFirst)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {stage.instrumentationWarning || stage.unavailableReason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ featureUsage?: object[] }} props
 */
export function QaAnalyticsFeatureUsageChart({ featureUsage = [] }) {
  const chartData = buildFeatureUsageChartData(featureUsage);

  if (featureUsage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature usage</CardTitle>
          <CardDescription>
            <QaAnalyticsTruncatedText lineClamp={2} text="No analytics events in period." />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature usage distribution</CardTitle>
        <CardDescription>
          <QaAnalyticsTruncatedText
            lineClamp={2}
            text="Event counts by feature — not a funnel."
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ChartContainer config={featureChartConfig} className="h-[240px] w-full">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="feature" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((row) => (
                <Cell key={row.feature} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureUsage.slice(0, 10).map((row) => (
                <TableRow key={row.feature}>
                  <TableCell>{row.feature}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * @param {{ eventNames?: object[] }} props
 */
export function QaAnalyticsEventNamesChart({ eventNames = [] }) {
  const chartData = eventNames.slice(0, 10).map((row, index) => ({
    eventName: row.eventName,
    count: row.count,
    fill: qaChartSeriesColor(index),
  }));

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top analytics events</CardTitle>
        <CardDescription>Raw eventName counts (product activity grain).</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ count: { label: "Events", color: QA_CHART_COLORS.comparison } }}
          className="h-[220px] w-full min-h-[220px]"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="eventName"
              tickLine={false}
              axisLine={false}
              width={160}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((row) => (
                <Cell key={row.eventName} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
