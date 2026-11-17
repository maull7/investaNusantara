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
    is_ai_generated: boolean;
    author?: { id: number; name: string };
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};
