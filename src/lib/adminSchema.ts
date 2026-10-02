export type FieldType = "text" | "textarea" | "list" | "select" | "image" | "file" | "files" | "cat" | "html" | "date" | "blocks";
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
    kind: "blog", id: "blog", label: "Journal", icon: "✍️", cats: true, addTop: true,
    fields: [
      { k: "date", label: "Date", t: "date" },
      { k: "cat", label: "Category", t: "cat" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "body", label: "Short summary (EN) — shown on the list card", t: "textarea" },
      { k: "bodyUz", label: "Qisqa tavsif (UZ) — ro'yxat kartasida", t: "textarea" },
      { k: "blocks", label: "Article — text & media blocks (first image = cover)", t: "blocks" },
      { k: "location", label: "Location", t: "text" },
    ],
    title: (i) => (i.title || i.titleUz || "(untitled)") + (i.date ? " · " + i.date : ""),
  },
  {
    kind: "project", id: "projects", label: "Projects", icon: "🚀", cats: true,
    fields: [
      { k: "icon", label: "Icon (emoji)", t: "text", ph: "🌐" },
      { k: "cat", label: "Category", t: "cat" },
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
      { k: "img", label: "Certificate image — shown in the carousel", t: "image" },
      { k: "badge", label: "Badge (THM / 🏅 / +)", t: "text" }, { k: "name", label: "Name (EN)", t: "text" },
      { k: "nameUz", label: "Name (UZ)", t: "text" }, { k: "meta", label: "Meta (EN)", t: "text" }, { k: "metaUz", label: "Meta (UZ)", t: "text" },
      { k: "file", label: "Certificate PDF / image", t: "file", accept: ".pdf,image/*" }, { k: "url", label: "Verify URL (optional)", t: "text", ph: "https://…" },
    ],
    title: (i) => i.name || i.nameUz || "(certificate)",
  },
  {
    kind: "course", id: "courses", label: "Learning", icon: "📖",
    fields: [
      { k: "icon", label: "Icon (emoji)", t: "text", ph: "📝" },
      { k: "tag", label: "Tag (EN)", t: "text", ph: "Exam prep" },
      { k: "tagUz", label: "Tag (UZ)", t: "text" },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "desc", label: "Description (EN)", t: "textarea" },
      { k: "descUz", label: "Description (UZ)", t: "textarea" },
      { k: "link", label: "Link", t: "text", ph: "aplus.html or /linux or https://…" },
      { k: "meta", label: "Meta (EN)", t: "text", ph: "90-minute timed exam" },
      { k: "metaUz", label: "Meta (UZ)", t: "text" },
    ],
    title: (i) => (i.icon ? i.icon + " " : "") + (i.title || i.titleUz || "(course)"),
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
      { k: "date", label: "Date", t: "date" },
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
    kind: "challenge", id: "challenges", label: "CTF Challenges", icon: "🏴", cats: true,
    fields: [
      { k: "title", label: "Title (EN)", t: "text" }, { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "prompt", label: "Task / question (EN) — rich text", t: "html" },
      { k: "promptUz", label: "Task / question (UZ) — rich text", t: "html" },
      { k: "command", label: "Terminal command to try (optional)", t: "text", ph: "cat /var/log/auth.log" },
      { k: "answer", label: "Correct answer / flag (exact match)", t: "text" },
      { k: "points", label: "Points", t: "text", ph: "20" },
      { k: "hint", label: "Hint (EN)", t: "text" }, { k: "hintUz", label: "Hint (UZ)", t: "text" },
      { k: "cat", label: "Category", t: "cat" },
    ],
    title: (i) => (i.title || i.titleUz || "(challenge)") + (i.points ? ` · ${i.points} pts` : ""),
  },
  {
    kind: "product", id: "market", label: "Market (archived)", icon: "🛒", cats: true, addTop: true,
    fields: [
      { k: "images", label: "Photos (first = main)", t: "files" },
      { k: "cat", label: "Category", t: "cat" },
      { k: "price", label: "Price (number only)", t: "text", ph: "120" },
      { k: "currency", label: "Currency", t: "select", opts: ["EUR", "USD", "UZS"] },
      { k: "origin", label: "Direction", t: "select", opts: ["EU → UZ", "UZ → EU", "In stock (UZ)", "In stock (EU)"] },
      { k: "stock", label: "Availability", t: "select", opts: ["in stock", "preorder", "sold out"] },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Nomi (UZ)", t: "text" },
      { k: "titleRu", label: "Название (RU)", t: "text" },
      { k: "titleDe", label: "Titel (DE)", t: "text" },
      { k: "desc", label: "Description (EN)", t: "textarea" },
      { k: "descUz", label: "Tavsif (UZ)", t: "textarea" },
      { k: "descRu", label: "Описание (RU)", t: "textarea" },
      { k: "descDe", label: "Beschreibung (DE)", t: "textarea" },
    ],
    title: (i) => (i.title || i.titleUz || i.titleRu || "(product)") + (i.price ? ` · ${i.price} ${i.currency || ""}` : ""),
  },
  {
    kind: "page", id: "pages", label: "Pages", icon: "📄", addTop: true,
    fields: [
      { k: "slug", label: "URL slug (letters, numbers, dashes)", t: "text", ph: "resources" },
      { k: "icon", label: "Icon (emoji)", t: "text", ph: "📚" },
      { k: "nav", label: "Show in navbar?", t: "select", opts: ["no", "yes"] },
      { k: "title", label: "Title (EN)", t: "text" },
      { k: "titleUz", label: "Title (UZ)", t: "text" },
      { k: "body", label: "Content (EN) — rich text", t: "html" },
      { k: "bodyUz", label: "Content (UZ) — rich text", t: "html" },
    ],
    title: (i) => (i.title || i.titleUz || i.slug || "(page)") + (i.slug ? " · /p/" + i.slug : ""),
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


/* ---------- Save-time normalization & validation ----------
   ItemManager runs every add/update through this before writing: strings are
   trimmed, number-ish fields are digit-stripped, the page slug is normalized
   and checked for uniqueness within the kind, and anything oversized is
   refused with a clear thrown error (the UI flashes it) instead of being
   silently truncated. */
export const MAX_FIELD_LEN = 20000;
const NAME_KEYS = ["title", "titleUz", "name", "nameUz", "role", "roleUz", "label", "labelUz", "degree", "degreeUz", "titleRu", "titleDe"];
const NUM_KEYS = ["price", "pct", "points"];

export function sanitizeItem(c: Collection, form: any, items: any[], excludeId?: string | null): any {
  const obj: any = { ...form };
  const labelOf = (k: string) => c.fields.find((f) => f.k === k)?.label || k;
  c.fields.forEach((f) => {
    const v = obj[f.k];
    if (f.t === "list" && typeof v === "string") { obj[f.k] = v.split("\n").map((s: string) => s.trim()).filter(Boolean); return; }
    if (typeof v !== "string") return;
    if (v.length > MAX_FIELD_LEN) throw new Error(`"${labelOf(f.k)}" is too long (${v.length.toLocaleString()} characters, max ${MAX_FIELD_LEN.toLocaleString()}) — shorten it and save again.`);
    let s = v.trim();
    if (NUM_KEYS.includes(f.k)) s = s.replace(/\D+/g, ""); // digits only
    obj[f.k] = s;
  });
  // keys not declared in the schema (legacy fields kept on edited items) still get the length guard
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.length > MAX_FIELD_LEN) throw new Error(`"${labelOf(k)}" is too long (${v.length.toLocaleString()} characters, max ${MAX_FIELD_LEN.toLocaleString()}).`);
  }
  // page slug: lowercase, trimmed, spaces → dashes, unique among the kind's items
  if (c.fields.some((f) => f.k === "slug")) {
    const slug = String(obj.slug || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Slug may only contain lowercase letters, numbers and dashes — spaces are converted automatically.");
    if (items.some((it) => it.__id !== excludeId && it.slug === slug)) throw new Error(`Slug "${slug}" is already used by another page — pick a different one.`);
    obj.slug = slug;
  }
  // whatever title-ish fields the collection defines, at least one must be filled
  const nameFields = c.fields.filter((f) => NAME_KEYS.includes(f.k));
  if (nameFields.length && nameFields.every((f) => !String(obj[f.k] || "").trim()))
    throw new Error(`A title is required — fill in "${labelOf(nameFields[0].k)}" (or another language variant).`);
  return obj;
}
