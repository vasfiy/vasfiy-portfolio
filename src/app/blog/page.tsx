import BlogList from "@/components/BlogList";
import { getSiteData } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Journal — Kamoliddin Tilonboyev",
  description: "Notes, posts and moments from the road.",
};

export default async function BlogPage() {
  const data = await getSiteData();
  return <BlogList posts={data.blog} cats={data.cats.blog || {}} />;
}
