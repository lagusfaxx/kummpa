export type NewsCategory =
  | "FOOD"
  | "GADGETS"
  | "VET_NEWS"
  | "HEALTH_TIPS"
  | "PET_EVENTS"
  | "HEALTH_ALERTS"
  | "ADOPTION"
  | "OTHER";

export interface NewsCategoryStat {
  id: NewsCategory;
  label: string;
  articlesCount: number;
}

export interface NewsArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: {
    id: NewsCategory;
    label: string;
  };
  tags: string[];
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  flags: {
    isFeatured: boolean;
    isPublished: boolean;
  };
  stats: {
    savesCount: number;
    sharesCount: number;
  };
  viewer: {
    isSaved: boolean;
  };
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticleDetail extends NewsArticleListItem {
  body: string;
}

export interface NewsArticlesQuery {
  q?: string;
  category?: NewsCategory;
  featuredOnly?: boolean;
  savedOnly?: boolean;
  publishedOnly?: boolean;
  sortBy?: "featured" | "recent";
  limit?: number;
}
