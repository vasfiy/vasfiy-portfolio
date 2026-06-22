import Home from "@/components/Home";
import { getSiteData } from "@/lib/data";

export const revalidate = 30;

export default async function Page() {
  const data = await getSiteData();
  return <Home data={data} />;
}
