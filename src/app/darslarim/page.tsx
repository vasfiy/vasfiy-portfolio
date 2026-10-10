import Darslarim from "@/components/Darslarim";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Darslarim — Kamoliddin Tilonboyev",
  description: "Live lesson platforms — the Speaking Daftari speaking-practice notebook: vocabulary, flashcards, quizzes and pronunciation drills with American-voice audio.",
};

export default function DarslarimPage() {
  return <Darslarim />;
}
