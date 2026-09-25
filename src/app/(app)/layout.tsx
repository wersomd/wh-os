import { auth } from "@/lib/auth";
import { IconRail } from "@/components/layout/icon-rail";
import { TopStrip } from "@/components/layout/top-strip";
import JarvisBar from "@/features/jarvis/components/jarvis-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = {
    email: session?.user?.email,
    name: session?.user?.name,
  };

  return (
    <div className="min-h-dvh">
      <IconRail />
      <div className="flex min-h-dvh flex-col pl-14">
        <TopStrip user={user} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <JarvisBar />
    </div>
  );
}
