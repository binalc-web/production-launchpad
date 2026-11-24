import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ChartCardSkeleton({ chartHeight = 280, showStats = false }) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        {showStats ? (
          <div className="flex gap-6 pt-1">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height: chartHeight }} />
      </CardContent>
    </Card>
  );
}

/** Skeleton layout matching the four project QA Analytics charts. */
export function QaProjectChartsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading QA analytics charts">
      <ChartCardSkeleton chartHeight={280} showStats />

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCardSkeleton chartHeight={260} />
        <ChartCardSkeleton chartHeight={260} />
      </div>

      <ChartCardSkeleton chartHeight={240} />
    </div>
  );
}
