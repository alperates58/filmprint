import { redirect } from "next/navigation";

export default function WatchLaterPage() {
  redirect("/library?tab=watch_later");
}
