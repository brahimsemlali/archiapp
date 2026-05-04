import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={8} />
    </div>
  );
}
