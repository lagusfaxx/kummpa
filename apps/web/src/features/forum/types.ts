export type ForumReportTargetType = "TOPIC" | "REPLY";
export type ForumReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";

export interface ForumUserSummary {
  id: string;
  fullName: string;
  role: string;
  handle?: string | null;
  avatarUrl?: string | null;
}

export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  stats: {
    topicsCount: number;
  };
}

export interface ForumTopicListItem {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: {
    id: string;
    slug: string;
    name: string;
  };
  author: ForumUserSummary;
  moderation: {
    isPinned: boolean;
    isLocked: boolean;
    isDeleted: boolean;
  };
  metrics: {
    repliesCount: number;
  };
  viewer: {
    isAuthor: boolean;
    canReply: boolean;
    canModerate: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ForumTopicDetail {
  id: string;
  title: string;
  body: string;
  tags: string[];
  category: {
    id: string;
    slug: string;
    name: string;
  };
  author: ForumUserSummary;
  moderation: {
    isPinned: boolean;
    isLocked: boolean;
    isDeleted: boolean;
  };
  replies: ForumReply[];
  viewer: {
    isAuthor: boolean;
    canReply: boolean;
    canModerate: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ForumReply {
  id: string;
  body: string;
  author: ForumUserSummary;
  quotedReply?: {
    id: string;
    bodyExcerpt: string;
    authorName: string;
  } | null;
  metrics: {
    usefulVotes: number;
  };
  viewer: {
    votedUseful: boolean;
    isAuthor: boolean;
    canModerate: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ForumListTopicsQuery {
  category?: string;
  q?: string;
  tag?: string;
  mine?: boolean;
  limit?: number;
}

export interface ForumCreateTopicPayload {
  categorySlug: string;
  title: string;
  body: string;
  tags?: string[];
}

export interface ForumCreateReplyPayload {
  body: string;
  quotedReplyId?: string;
}

export interface ForumUsefulVoteSnapshot {
  replyId: string;
  usefulCount: number;
  votedUseful: boolean;
}

export interface ForumCreateReportPayload {
  targetType: ForumReportTargetType;
  targetId: string;
  reason: string;
}

export interface ForumReport {
  id: string;
  targetType: ForumReportTargetType;
  reason: string;
  status: ForumReportStatus;
  reporter: {
    id: string;
    fullName: string;
  };
  target: {
    topicId?: string | null;
    topicTitle?: string | null;
    replyId?: string | null;
    replyExcerpt?: string | null;
  };
  review: {
    reviewedAt?: string | null;
    reviewNotes?: string | null;
    reviewedBy?: {
      id: string;
      fullName: string;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}
