import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-8 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground opacity-30" />
      <div>
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Cette page n'existe pas ou a été déplacée.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline">Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}
