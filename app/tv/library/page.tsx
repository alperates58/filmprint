import { redirect } from "next/navigation";

export default function TvLibraryPage() {
  redirect("/library?mediaType=TV");
}
