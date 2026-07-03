export type Lang = "en" | "uz";

export interface Job { role?: string; roleUz?: string; date?: string; company?: string; meta?: string; metaUz?: string; bullets?: string[]; bulletsUz?: string[]; pinned?: boolean; __id?: string; }
export interface Skill { icon?: string; name?: string; nameUz?: string; tags?: string[]; pinned?: boolean; __id?: string; }
export interface Cert { badge?: string; name?: string; nameUz?: string; meta?: string; metaUz?: string; file?: string; url?: string; pinned?: boolean; __id?: string; }
export interface Project { icon?: string; cat?: string; period?: string; title?: string; titleUz?: string; sub?: string; subUz?: string; desc?: string; descUz?: string; tags?: string[]; linkUrl?: string; linkLabel?: string; linkLabelUz?: string; pinned?: boolean; __id?: string; }
export interface Education { degree?: string; degreeUz?: string; date?: string; dateUz?: string; school?: string; schoolUz?: string; pinned?: boolean; __id?: string; }
export interface Language { label?: string; labelUz?: string; pct?: number | string; pinned?: boolean; __id?: string; }
export interface Photo { src?: string; emoji?: string; album?: string; albumUz?: string; cat?: string; caption?: string; captionUz?: string; location?: string; video?: boolean; pinned?: boolean; __id?: string; }
export interface Block { type: "text" | "image" | "video" | "youtube" | "file"; text?: string; textUz?: string; url?: string; name?: string; caption?: string; captionUz?: string; }
export interface Post { type?: "text" | "image" | "video" | "youtube"; media?: string; title?: string; titleUz?: string; body?: string; bodyUz?: string; full?: string; fullUz?: string; blocks?: Block[]; date?: string; location?: string; cat?: string; pinned?: boolean; __id?: string; }
export interface Book { title?: string; titleUz?: string; author?: string; desc?: string; descUz?: string; cover?: string; file?: string; cat?: string; pinned?: boolean; __id?: string; }
export interface Challenge { title?: string; titleUz?: string; prompt?: string; promptUz?: string; command?: string; hint?: string; hintUz?: string; answer?: string; points?: number | string; cat?: string; pinned?: boolean; __id?: string; }
export interface Category { en?: string; uz?: string; icon?: string; }
export interface Product {
  title?: string; titleUz?: string; titleRu?: string; titleDe?: string;
  desc?: string; descUz?: string; descRu?: string; descDe?: string;
  images?: { url: string; name?: string; type?: string }[];
  price?: string; currency?: string; origin?: string; stock?: string; cat?: string;
  pinned?: boolean; archived?: boolean; __id?: string;
}
export interface Page { slug?: string; title?: string; titleUz?: string; icon?: string; nav?: string; body?: string; bodyUz?: string; pinned?: boolean; __id?: string; }

export interface SiteData {
  gallery: Photo[];
  blog: Post[];
  books: Book[];
  experience: Job[];
  skills: Skill[];
  certs: Cert[];
  projects: Project[];
  education: Education[];
  languages: Language[];
  challenges: Challenge[];
  pages: Page[];
  products: Product[];
  galleryCats: Record<string, Category>;
  bookCats: Record<string, Category>;
  /** All managed categories, keyed by item kind then category key. */
  cats: Record<string, Record<string, Category>>;
  settings: Record<string, any>;
}

export interface Album { key: string; album: string | null; albumUz: string | null; cat: string | null; photos: Photo[]; }
