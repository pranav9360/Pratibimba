import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-bg">
      <SideNav />
      <main className="ml-[260px] min-h-screen flex flex-col">
        <TopNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
