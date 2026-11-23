export type Region = {
    code: string;
    name: string;
    slug: string;
    image_url?: string | null;
    level?: number;
    type?: string | null;
    parent_code?: string | null;
    parent?: Region | null;
};

export type Category = { id: number; name: string; slug: string };

export type ArticleStatus = 'draft' | 'review' | 'published' | 'rejected';

export type ArticleCard = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    cover_url: string | null;
    published_at: string | null;
    is_breaking: boolean;
    is_ai_generated?: boolean;
    sentiment?: 'positif' | 'netral' | 'negatif' | null;
    category: Category;
    region: Region | null;
};

export type Article = ArticleCard & {
    body: string;
    views: number;
    status: ArticleStatus;
    category_id: number;
    region_code: string | null;
    is_headline: boolean;
    source_name: string | null;
    source_url: string | null;
    source_title: string | null;
    source_excerpt: string | null;
    is_ai_generated: boolean;
    editor?: { id: number; name: string } | null;
    seo_title: string | null;
    meta_description: string | null;
    social_post: string | null;
    author?: { id: number; name: string };
    tags?: Tag[];
};

export type Tag = { id: number; name: string; slug?: string };

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

export type ArticleReview = {
    status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
    points: string[] | null;
    body: string | null;
    error: string | null;
};

export type DirectoryType =
    | 'wisata'
    | 'umkm'
    | 'event'
    | 'industri'
    | 'infrastruktur'
    | 'properti'
    | 'pendidikan';

export type EventCategory =
    | 'daerah'
    | 'seminar'
    | 'workshop'
    | 'festival'
    | 'pameran';

export type DirectoryEntry = {
    id: number;
    region_code?: string;
    type: DirectoryType;
    slug?: string | null;
    category?: EventCategory | null;
    organizer?: string | null;
    contact?: string | null;
    featured_requested?: boolean;
    featured_at?: string | null;
    submitter?: { id: number; name: string } | null;
    region?: Region | null;
    name: string;
    description: string | null;
    address: string | null;
    website: string | null;
    source_url: string | null;
    starts_on: string | null;
    ends_on: string | null;
    verified_at?: string | null;
};

export type Fact = {
    value: string;
    source: string | null;
    as_of: string | null;
};

export type FactField = { key: string; label: string; unit: string | null };

export type RegionProfile = {
    facts: Record<string, Fact> | null;
    description: string | null;
    description_source: string | null;
    verified_at: string | null;
    verifier?: { id: number; name: string } | null;
};

export type Topic = { key: string; label: string };
