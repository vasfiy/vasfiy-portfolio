/* ============================================================
   LINUX & CYBERSECURITY DARSLARI — bu yerni o'zingiz tahrirlaysiz
   ------------------------------------------------------------
   Har kungi dars qo'shish uchun window.LESSONS ro'yxatiga bitta
   { ... } obyekt qo'shing. Eng yangi darsni ro'yxat BOSHIGA qo'ying.
   ============================================================ */

/* Dars kategoriyalari (filtr tugmalari shu yerdan yasaladi) */
window.LESSON_CATEGORIES = {
  linux:      { en: "Linux",      uz: "Linux",        icon: "🐧" },
  security:   { en: "Security",   uz: "Xavfsizlik",   icon: "🛡️" },
  networking: { en: "Networking", uz: "Tarmoq",       icon: "🛰️" },
  tools:      { en: "Tools",      uz: "Vositalar",    icon: "🧰" }
};

/*
  Har bir dars:
  {
    date: "2026-06-18",
    cat: "linux",                         // yuqoridagi kalitlardan biri
    title: "English title", titleUz: "O'zbekcha sarlavha",
    body: "Matn... \n\n yangi xatboshi. `kod` orqali inline kod.",
    bodyUz: "...",
    commands: ["ls -la", "cat welcome.txt"]   // (ixtiyoriy) terminalda sinab ko'rish uchun
  }
*/
window.LESSONS = [
  {
    date: "2026-06-18", cat: "linux",
    title: "Navigating the filesystem",
    titleUz: "Fayl tizimida harakatlanish",
    body: "Every Linux journey starts with three commands: `pwd` (where am I?), `ls` (what's here?) and `cd` (go somewhere).\n\nTry `pwd` to print your current directory, then `ls -la` to list everything including hidden files. Use `cd notes` to enter a folder and `cd ..` to go back up.",
    bodyUz: "Har bir Linux safari uchta buyruqdan boshlanadi: `pwd` (qayerdaman?), `ls` (bu yerda nima bor?) va `cd` (boshqa joyga o'tish).\n\nJoriy papkani ko'rsatish uchun `pwd` ni, yashirin fayllar bilan birga ro'yxat uchun `ls -la` ni sinab ko'ring. Papkaga kirish uchun `cd notes`, orqaga qaytish uchun `cd ..` dan foydalaning.",
    commands: ["pwd", "ls -la", "cd notes", "ls"]
  },
  {
    date: "2026-06-16", cat: "linux",
    title: "Reading files without opening an editor",
    titleUz: "Faylni tahrirlovchisiz o'qish",
    body: "`cat` prints a whole file. For big files use `head` (first lines) and `tail` (last lines). Search inside files with `grep`.\n\nTry `cat welcome.txt`, then `grep linux notes/linux-basics.md` to find a word.",
    bodyUz: "`cat` butun faylni chop etadi. Katta fayllar uchun `head` (boshidan) va `tail` (oxiridan) ishlating. Fayl ichidan qidirish uchun `grep`.\n\n`cat welcome.txt` ni, so'ng so'z topish uchun `grep linux notes/linux-basics.md` ni sinab ko'ring.",
    commands: ["cat welcome.txt", "head notes/networking.md", "grep linux notes/linux-basics.md"]
  },
  {
    date: "2026-06-14", cat: "security",
    title: "What is the CIA triad?",
    titleUz: "CIA uchligi nima?",
    body: "Security rests on three pillars — Confidentiality, Integrity, Availability. Every control you'll ever deploy protects at least one of them.\n\nAs a SOC analyst, most alerts map to a threat against one pillar: data theft (C), tampering (I), or denial of service (A).",
    bodyUz: "Xavfsizlik uch ustunga tayanadi — Maxfiylik (Confidentiality), Yaxlitlik (Integrity), Mavjudlik (Availability). Siz joriy etadigan har bir nazorat ulardan kamida bittasini himoya qiladi.\n\nSOC analitik sifatida ko'pchilik signallar bitta ustunga qarshi tahdidga to'g'ri keladi: ma'lumot o'g'irlash (C), buzish (I) yoki xizmatdan voz kechtirish (A).",
    commands: ["cat labs/cia-triad.txt", "tree"]
  },
  {
    date: "2026-06-12", cat: "networking",
    title: "Ports, protocols & the TCP handshake",
    titleUz: "Portlar, protokollar va TCP qo'l berishish",
    body: "Services listen on ports: HTTP on 80, HTTPS on 443, SSH on 22. A TCP connection opens with a three-way handshake: SYN → SYN/ACK → ACK.\n\nKnowing default ports lets you read a packet capture or a scan result at a glance.",
    bodyUz: "Xizmatlar portlarni tinglaydi: HTTP 80-da, HTTPS 443-da, SSH 22-da. TCP ulanish uch bosqichli qo'l berishish bilan ochiladi: SYN → SYN/ACK → ACK.\n\nStandart portlarni bilish paket tahlilini yoki skanerlash natijasini bir qarashda o'qishga yordam beradi.",
    commands: ["cat notes/networking.md", "ping localhost"]
  }
];
