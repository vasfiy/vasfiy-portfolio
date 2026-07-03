import Home from "@/components/Home";
import { getSiteData } from "@/lib/data";

export const revalidate = 30;

export default async function Page() {
  const data = await getSiteData();
  const st = data.settings.siteText || {};
  const ld = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kamoliddin Tilonboyev",
    jobTitle: "SOC Analyst",
    description: st.heroDesc || "Aspiring SOC Analyst — blue-team operations, threat monitoring & network analysis.",
    url: "https://vasfiy.com",
    sameAs: [st.socialLinkedin, st.socialWebsite].filter(Boolean),
    knowsAbout: ["SOC Analysis", "Blue Team", "Wireshark", "SIEM", "Linux", "Python", "Network Security", "Incident Response"],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Home data={data} />
    </>
  );
}
