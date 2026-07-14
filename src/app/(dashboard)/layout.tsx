import { AppSidebar } from "@/components/layout/app-sidebar";

// Dashboard pages read from the database at request time — skip static prerender at build.
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-auto">
        <div className="flex-1 p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
