import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: any = null;

  try {
    session = await getSession();
  } catch {
    session = null;
  }

  if (!session?.address) {
    redirect("/login");
  }

  return <>{children}</>;
}