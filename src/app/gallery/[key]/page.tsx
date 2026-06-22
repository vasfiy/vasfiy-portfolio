import AlbumView from "@/components/AlbumView";
import { getSiteData, pinSort } from "@/lib/data";
import type { Metadata } from "next";
import type { Photo } from "@/lib/types";

export const revalidate = 30;

const keyOf = (it: Photo) => (it.album ? "a:" + it.album : it.cat ? "c:" + it.cat : "a:Gallery");

async function findAlbum(rawKey: string) {
  const key = decodeURIComponent(rawKey);
  const data = await getSiteData();
  const photos = pinSort(data.gallery.filter((p) => keyOf(p) === key));
  let name = "Gallery";
  if (photos.length) {
    const f = photos[0];
    name = f.album || (f.cat ? ((data.galleryCats[f.cat] && (data.galleryCats[f.cat].en)) || f.cat) : "Gallery");
  }
  return { name, photos };
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const { name } = await findAlbum(key);
  return { title: `${name} — Kamoliddin Tilonboyev`, description: `Photo album: ${name}.`, openGraph: { title: name, images: ["/og-image.jpg"] } };
}

export default async function AlbumPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { name, photos } = await findAlbum(key);
  return <AlbumView name={name} photos={photos} />;
}
