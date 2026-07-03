import PostView from "@/components/PostView";
import { getSiteData, blogSort } from "@/lib/data";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Post } from "@/lib/types";

export const revalidate = 30;

async function findPost(id: string): Promise<{ post: Post | null; related: Post[] }> {
  const data = await getSiteData();
  const posts = data.blog;
  let post = posts.find((p) => String(p.__id) === id) || null;
  if (!post && /^\d+$/.test(id)) post = posts[Number(id)] || null;
  const related = blogSort(posts.filter((p) => p !== post)).slice(0, 3);
  return { post, related };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { post } = await findPost(id);
  if (!post) return { title: "Post — Kamoliddin Tilonboyev" };
  const title = post.title || post.titleUz || "Post";
  const desc = (post.body || post.bodyUz || "").slice(0, 160);
  const cover = (post.blocks || []).find((b) => b.type === "image" && b.url)?.url;
  const img = cover || (post.type === "image" && post.media ? post.media : "/og-image.jpg");
  return {
    title: `${title} — Kamoliddin Tilonboyev`,
    description: desc,
    openGraph: { title, description: desc, images: [img], type: "article" },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { post, related } = await findPost(id);
  if (!post) notFound(); // real 404 status for SEO instead of a soft 200
  return <PostView post={post} related={related} />;
}
