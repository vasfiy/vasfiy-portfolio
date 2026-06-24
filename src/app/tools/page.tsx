import Tools from "@/components/Tools";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools — Kamoliddin Tilonboyev",
  description: "Free in-browser tools: QR code generator, password generator, word counter, Base64.",
};

export default function ToolsPage() {
  return <Tools />;
}
