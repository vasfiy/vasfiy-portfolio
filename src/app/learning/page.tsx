import Learning from "@/components/Learning";
import { getSiteData } from "@/lib/data";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Learning — Kamoliddin Tilonboyev",
  description: "Exam simulators, hands-on labs and interactive courses — CompTIA A+ practice exams and a Linux & cybersecurity lab.",
};

export default async function LearningPage() {
  const data = await getSiteData();
  return <Learning courses={data.courses} />;
}
