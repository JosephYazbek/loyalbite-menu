import { BranchesClient } from "@/components/branches-client";

export default function BranchesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
        <BranchesClient />
      </div>
    </div>
  );
}
