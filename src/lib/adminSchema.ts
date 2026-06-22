export type FieldType = "text" | "textarea" | "list" | "select" | "image" | "file" | "files" | "cat" | "html";
export interface Field { k: string; label: string; t: FieldType; opts?: string[]; ph?: string; accept?: string; }
export interface Collection {
  kind: string;        // items.kind value
  id: string;          // url/tab id
  label: string;
  icon: string;
  fields: Field[];
  cats?: boolean;      // has its own category set
  album?: boolean;     // gallery-style multi-upload composer
  addTop?: boolean;
  title: (i: any) => string;
}

export const COLLECTIONS: Collection[] = [
  {
    kind: "gallery", id: "gallery", label: "Gallery", icon: "🖼️", cats: true, album: true,
    fields: [
      { k: "src", label: "Image", t: "image" },
      { k: "album", label: "Album name", t: "text", ph: "Istanbul 2025" },
      { k: "albumUz", label: "Album name (UZ)", t: "text" },
      { k: "cat", label: "Category key", t: "cat" },
      { k: "caption", label: "Caption (EN)", t: "text" },
      { k: "captionUz", label: "Caption (UZ)", t: "text" },
      { k: "location", label: "Location", t: "text", ph: "Tashkent, UZ" },
    ],
    title: (i) => (i.album ? "🗂 " + i.album + " · " : "") + (i.caption || i.captionUz || "photo"),
  },
  {
    kind: "blog", id: "blog", label: "Journal", icon: "✍️", cats: false, addTop: true,
    fields: [
      { k: "date", label: "Date", t: "text", ph: "2026-06-20" },
      { k: "type", label: "Type", t: "select", opts: ["text", "image", "youtube", "video"] },
      { k: "media", label: "Media (upload, or YouTube URL)", t: "file", accept: "image/*,video/*" },
      { k: "cat", label: "Category", t: "text", ph: "Travel" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "body", label: "Short text (EN)", t: "textarea" },
      { k: "bodyUz", label: "Short text (UZ)", t: "textarea" },
      { k: "full", label: "Full article (EN) — rich text", t: "html" },
      { k: "fullUz", label: "Full article (UZ) — rich text", t: "html" },
      { k: "location", label: "Location", t: "text" },
    ],
    title: (i) => (i.title || i.titleUz || "(untitled)") + (i.date ? " · " + i.date : ""),
  },
  {
    kind: "project", id: "projects", label: "Projects", icon: "🚀",
    fields: [
      { k: "icon", label: "Icon (emoji)", t: "text", ph: "🌐" },
      { k: "period", label: "Period", t: "text", ph: "2023 – Present" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "sub", label: "Subtitle (EN)", t: "text" },
      { k: "subUz", label: "Subtitle (UZ)", t: "text" },
      { k: "desc", label: "Description (EN)", t: "textarea" },
      { k: "descUz", label: "Description (UZ)", t: "textarea" },
      { k: "tags", label: "Tags (one per line)", t: "list" },
      { k: "linkUrl", label: "Link URL", t: "text", ph: "https://…" },
      { k: "linkLabel", label: "Link label (EN)", t: "text" },
      { k: "linkLabelUz", label: "Link label (UZ)", t: "text" },
    ],
    title: (i) => (i.icon ? i.icon + " " : "") + (i.title || i.titleUz || "(project)"),
  },
  {
    kind: "experience", id: "experience", label: "Experience", icon: "💼",
    fields: [
      { k: "role", label: "Role (EN)", t: "text" }, { k: "roleUz", label: "Role (UZ)", t: "text" },
      { k: "company", label: "Company", t: "text" }, { k: "date", label: "Date", t: "text" },
      { k: "meta", label: "Meta (EN)", t: "text" }, { k: "metaUz", label: "Meta (UZ)", t: "text" },
      { k: "bullets", label: "Bullets EN (one per line)", t: "list" },
      { k: "bulletsUz", label: "Bullets UZ (one per line)", t: "list" },
    ],
    title: (i) => (i.role || i.roleUz || "(role)") + (i.company ? " · " + i.company : ""),
  },
  {
    kind: "skill", id: "skills", label: "Skills", icon: "🧠",
    fields: [
      { k: "icon", label: "Icon (emoji)", t: "text" }, { k: "name", label: "Name (EN)", t: "text" },
      { k: "nameUz", label: "Name (UZ)", t: "text" }, { k: "tags", label: "Tags (one per line)", t: "list" },
    ],
    title: (i) => (i.icon ? i.icon + " " : "") + (i.name || i.nameUz || "(category)"),
  },
  {
    kind: "education", id: "education", label: "Education", icon: "🎓",
    fields: [
      { k: "degree", label: "Degree (EN)", t: "text" }, { k: "degreeUz", label: "Degree (UZ)", t: "text" },
      { k: "date", label: "Date (EN)", t: "text" }, { k: "dateUz", label: "Date (UZ)", t: "text" },
      { k: "school", label: "School (EN)", t: "text" }, { k: "schoolUz", label: "School (UZ)", t: "text" },
    ],
    title: (i) => (i.degree || i.degreeUz || "(degree)") + (i.school ? " · " + i.school : ""),
  },
  {
    kind: "language", id: "languages", label: "Languages", icon: "🌍",
    fields: [
      { k: "label", label: "Language + level (EN)", t: "text" }, { k: "labelUz", label: "Language + level (UZ)", t: "text" },
      { k: "pct", label: "Proficiency % (0–100)", t: "text" },
    ],
    title: (i) => (i.label || i.labelUz || "(language)") + (i.pct ? " · " + i.pct + "%" : ""),
  },
  {
    kind: "cert", id: "certs", label: "Certs", icon: "📜",
    fields: [
      { k: "badge", label: "Badge (THM / 🏅 / +)", t: "text" }, { k: "name", label: "Name (EN)", t: "text" },
      { k: "nameUz", label: "Name (UZ)", t: "text" }, { k: "meta", label: "Meta (EN)", t: "text" }, { k: "metaUz", label: "Meta (UZ)", t: "text" },
    ],
    title: (i) => i.name || i.nameUz || "(certificate)",
  },
  {
    kind: "book", id: "books", label: "Library", icon: "📚", cats: true,
    fields: [
      { k: "cover", label: "Cover image", t: "image" }, { k: "file", label: "PDF file", t: "file", accept: "application/pdf,.pdf" },
      { k: "title", label: "Title (EN)", t: "text" }, { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "author", label: "Author", t: "text" }, { k: "cat", label: "Category key", t: "cat" },
      { k: "desc", label: "Description (EN)", t: "textarea" }, { k: "descUz", label: "Description (UZ)", t: "textarea" },
    ],
    title: (i) => i.title || i.titleUz || "(book)",
  },
  {
    kind: "lesson", id: "lessons", label: "Linux Lab", icon: "🐧", cats: true, addTop: true,
    fields: [
      { k: "date", label: "Date", t: "text", ph: "2026-06-20" },
      { k: "cat", label: "Category key", t: "cat" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "body", label: "Lesson body (EN) — rich text", t: "html" },
      { k: "bodyUz", label: "Lesson body (UZ) — rich text", t: "html" },
      { k: "commands", label: "Try-in-terminal commands (one per line)", t: "list" },
      { k: "attachments", label: "Attachments — HTML / PDF / image / video / any", t: "files" },
    ],
    title: (i) => (i.title || i.titleUz || "(lesson)") + (i.cat ? " · " + i.cat : ""),
  },
  {
    kind: "challenge", id: "challenges", label: "CTF Challenges", icon: "🏴",
    fields: [
      { k: "title", label: "Title (EN)", t: "text" }, { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "prompt", label: "Task / question (EN) — rich text", t: "html" },
      { k: "promptUz", label: "Task / question (UZ) — rich text", t: "html" },
      { k: "command", label: "Terminal command to try (optional)", t: "text", ph: "cat /var/log/auth.log" },
      { k: "answer", label: "Correct answer / flag (exact match)", t: "text" },
      { k: "points", label: "Points", t: "text", ph: "20" },
      { k: "hint", label: "Hint (EN)", t: "text" }, { k: "hintUz", label: "Hint (UZ)", t: "text" },
      { k: "cat", label: "Category key", t: "text", ph: "linux / security / networking" },
    ],
    title: (i) => (i.title || i.titleUz || "(challenge)") + (i.points ? ` · ${i.points} pts` : ""),
  },
];

/* Site text (settings.siteText) — grouped for a friendlier editor */
export const SITE_GROUPS: { group: string; fields: Field[] }[] = [
  {
    group: "Hero", fields: [
      { k: "heroBadge", label: "Hero badge (EN)", t: "text" }, { k: "heroBadgeUz", label: "Hero badge (UZ)", t: "text" },
      { k: "heroRoles", label: "Rotating titles EN (one per line)", t: "list" }, { k: "heroRolesUz", label: "Rotating titles UZ", t: "list" },
      { k: "heroDesc", label: "Hero description (EN)", t: "textarea" }, { k: "heroDescUz", label: "Hero description (UZ)", t: "textarea" },
    ],
  },
  {
    group: "About", fields: [
      { k: "aboutTitle", label: "About title (EN)", t: "text" }, { k: "aboutTitleUz", label: "About title (UZ)", t: "text" },
      { k: "aboutP1", label: "Paragraph 1 (EN)", t: "textarea" }, { k: "aboutP1Uz", label: "Paragraph 1 (UZ)", t: "textarea" },
      { k: "aboutP2", label: "Paragraph 2 (EN)", t: "textarea" }, { k: "aboutP2Uz", label: "Paragraph 2 (UZ)", t: "textarea" },
      { k: "aboutP3", label: "Paragraph 3 (EN)", t: "textarea" }, { k: "aboutP3Uz", label: "Paragraph 3 (UZ)", t: "textarea" },
    ],
  },
  {
    group: "Stats", fields: ([1, 2, 3, 4] as const).flatMap((n) => [
      { k: `stat${n}Num`, label: `Stat ${n} — number`, t: "text" as FieldType },
      { k: `stat${n}Suffix`, label: `Stat ${n} — suffix`, t: "text" as FieldType },
      { k: `stat${n}Label`, label: `Stat ${n} — label (EN)`, t: "text" as FieldType },
      { k: `stat${n}LabelUz`, label: `Stat ${n} — label (UZ)`, t: "text" as FieldType },
    ]),
  },
  {
    group: "Contact & Socials", fields: [
      { k: "contactTitle", label: "Contact title (EN)", t: "text" }, { k: "contactTitleUz", label: "Contact title (UZ)", t: "text" },
      { k: "contactDesc", label: "Contact description (EN)", t: "textarea" }, { k: "contactDescUz", label: "Contact description (UZ)", t: "textarea" },
      { k: "socialLinkedin", label: "LinkedIn URL", t: "text" }, { k: "socialWebsite", label: "Website URL", t: "text" }, { k: "socialEmail", label: "Email", t: "text" },
      { k: "contactLocation", label: "Location (EN)", t: "text" }, { k: "contactLocationUz", label: "Location (UZ)", t: "text" },
      { k: "contactWebsite", label: "Website label", t: "text" }, { k: "contactRelocate", label: "Relocation note (EN)", t: "text" }, { k: "contactRelocateUz", label: "Relocation note (UZ)", t: "text" },
    ],
  },
  {
    group: "Section headings & SEO", fields: [
      { k: "skillsTitle", label: "Skills heading (EN)", t: "text" }, { k: "skillsTitleUz", label: "Skills heading (UZ)", t: "text" },
      { k: "expTitle", label: "Experience heading (EN)", t: "text" }, { k: "expTitleUz", label: "Experience heading (UZ)", t: "text" },
      { k: "projTitle", label: "Projects heading (EN)", t: "text" }, { k: "projTitleUz", label: "Projects heading (UZ)", t: "text" },
      { k: "eduTitle", label: "Education heading (EN)", t: "text" }, { k: "eduTitleUz", label: "Education heading (UZ)", t: "text" },
      { k: "metaTitle", label: "SEO title (EN)", t: "text" }, { k: "metaTitleUz", label: "SEO title (UZ)", t: "text" },
      { k: "metaDesc", label: "SEO description (EN)", t: "textarea" }, { k: "metaDescUz", label: "SEO description (UZ)", t: "textarea" },
    ],
  },
];
