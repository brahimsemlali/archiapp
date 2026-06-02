import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function DevisLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={6} />
    </div>
  );
}
