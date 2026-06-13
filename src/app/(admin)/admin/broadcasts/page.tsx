import { redirect } from "next/navigation";

export default function BroadcastsDashboardRedirect() {
  redirect("/admin/broadcasts/history");
}
