import { redirect } from "next/navigation";

/** The profile is edited in "My page" now, above its blocks. */
export default function DashboardProfilePage() {
  redirect("/dashboard/page");
}
