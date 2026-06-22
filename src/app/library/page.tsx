import LibraryGrid from "@/components/LibraryGrid";
import { getSiteData } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Library — Kamoliddin Tilonboyev",
  description: "Books and resources worth your time.",
};

export default async function LibraryPage() {
  const data = await getSiteData();
  return <LibraryGrid books={data.books} cats={data.bookCats} />;
}
