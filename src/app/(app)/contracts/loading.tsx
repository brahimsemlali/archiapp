import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function ContractsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={5} />
    </div>
  );
}
