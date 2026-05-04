import { StatCardsSkeleton, CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <CardListSkeleton count={5} />
    </div>
  );
}
