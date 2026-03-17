import {
  ForumReportStatus,
  ForumReportTargetType,
  Prisma,
  UserRole
} from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreateReplyInput,
  CreateReportInput,
  CreateTopicInput,
  ListReportsQueryInput,
  ListTopicsQueryInput,
  ModerateReplyInput,
  ModerateTopicInput,
  ReviewReportInput
} from "./forum.schemas";

interface ForumActor {
  id: string;
  role: UserRole;
}

const DEFAULT_FORUM_CATEGORIES: Array<{
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}> = [
  {
    slug: "salud",
    name: "Salud",
    description: "Consultas generales de salud y signos de alerta.",
    sortOrder: 10
  },
  {
    slug: "alimentacion",
    name: "Alimentacion",
    description: "Dudas sobre dietas, porciones y alimentos recomendados.",
    sortOrder: 20
  },
  {
    slug: "vacunas",
    name: "Vacunas",
    description: "Esquemas de vacunacion y seguimiento preventivo.",
    sortOrder: 30
  },
  {
    slug: "entrenamiento",
    name: "Entrenamiento",
    description: "Conducta, obediencia y socializacion.",
    sortOrder: 40
  },
  {
    slug: "perros",
    name: "Perros",
    description: "Comunidad y experiencias para perros.",
    sortOrder: 50
  },
  {
    slug: "gatos",
    name: "Gatos",
    description: "Comunidad y experiencias para gatos.",
    sortOrder: 60
  },
  {
    slug: "mascotas-exoticas",
    name: "Mascotas exoticas",
    description: "Consultas para aves, roedores, reptiles y otras especies.",
    sortOrder: 70
  },
  {
    slug: "recomendaciones",
    name: "Recomendaciones",
    description: "Recomendaciones de servicios, productos y rutinas.",
    sortOrder: 80
  },
  {
    slug: "experiencias",
    name: "Experiencias",
    description: "Historias y aprendizajes de la comunidad.",
    sortOrder: 90
  },
  {
    slug: "mascotas-perdidas",
    name: "Mascotas perdidas",
    description: "Apoyo comunitario para casos de perdida y busqueda.",
    sortOrder: 100
  },
  {
    slug: "adopcion",
    name: "Adopcion",
    description: "Consejos y experiencias de adopcion responsable.",
    sortOrder: 110
  }
];

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function uniqueNormalizedTags(tags: string[]) {
  const normalized = tags
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

  return Array.from(new Set(normalized));
}

function forumUserSummary(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role?: UserRole;
  socialProfile?: { handle: string | null; avatarUrl: string | null } | null;
  ownerProfile?: { avatarUrl: string | null } | null;
}) {
  return {
    id: user.id,
    fullName: fullName(user.firstName, user.lastName) || "Usuario Kumpa",
    role: user.role ?? UserRole.OWNER,
    handle: user.socialProfile?.handle ?? null,
    avatarUrl: user.socialProfile?.avatarUrl ?? user.ownerProfile?.avatarUrl ?? null
  };
}

async function ensureDefaultForumCategories() {
  await prisma.forumCategory.createMany({
    data: DEFAULT_FORUM_CATEGORIES,
    skipDuplicates: true
  });
}

const topicListInclude = {
  category: {
    select: {
      id: true,
      slug: true,
      name: true
    }
  },
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  },
  _count: {
    select: {
      replies: true
    }
  }
} satisfies Prisma.ForumTopicInclude;

type ForumTopicWithList = Prisma.ForumTopicGetPayload<{
  include: typeof topicListInclude;
}>;

const topicDetailInclude = {
  category: {
    select: {
      id: true,
      slug: true,
      name: true
    }
  },
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  },
  replies: {
    where: {
      deletedAt: null
    },
    orderBy: {
      createdAt: "asc"
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          socialProfile: {
            select: {
              handle: true,
              avatarUrl: true
            }
          },
          ownerProfile: {
            select: {
              avatarUrl: true
            }
          }
        }
      },
      quotedReply: {
        select: {
          id: true,
          body: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      },
      _count: {
        select: {
          usefulVotes: true
        }
      }
    }
  }
} satisfies Prisma.ForumTopicInclude;

type ForumTopicWithDetail = Prisma.ForumTopicGetPayload<{
  include: typeof topicDetailInclude;
}>;

function serializeTopicListItem(actor: ForumActor, topic: ForumTopicWithList) {
  return {
    id: topic.id,
    title: topic.title,
    excerpt: topic.body.length > 240 ? `${topic.body.slice(0, 240)}...` : topic.body,
    tags: topic.tags,
    category: topic.category,
    author: forumUserSummary(topic.author),
    moderation: {
      isPinned: topic.isPinned,
      isLocked: topic.isLocked,
      isDeleted: Boolean(topic.deletedAt)
    },
    metrics: {
      repliesCount: topic._count.replies
    },
    viewer: {
      isAuthor: topic.authorId === actor.id,
      canReply: !topic.isLocked && !topic.deletedAt,
      canModerate: actor.role === UserRole.ADMIN
    },
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString()
  };
}

function serializeTopicDetail(
  actor: ForumActor,
  topic: ForumTopicWithDetail,
  votedReplyIds: Set<string>
) {
  return {
    id: topic.id,
    title: topic.title,
    body: topic.body,
    tags: topic.tags,
    category: topic.category,
    author: forumUserSummary(topic.author),
    moderation: {
      isPinned: topic.isPinned,
      isLocked: topic.isLocked,
      isDeleted: Boolean(topic.deletedAt)
    },
    replies: topic.replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      author: forumUserSummary(reply.author),
      quotedReply: reply.quotedReply
        ? {
            id: reply.quotedReply.id,
            bodyExcerpt:
              reply.quotedReply.body.length > 180
                ? `${reply.quotedReply.body.slice(0, 180)}...`
                : reply.quotedReply.body,
            authorName:
              fullName(reply.quotedReply.author.firstName, reply.quotedReply.author.lastName) ||
              "Usuario Kumpa"
          }
        : null,
      metrics: {
        usefulVotes: reply._count.usefulVotes
      },
      viewer: {
        votedUseful: votedReplyIds.has(reply.id),
        isAuthor: reply.authorId === actor.id,
        canModerate: actor.role === UserRole.ADMIN
      },
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString()
    })),
    viewer: {
      isAuthor: topic.authorId === actor.id,
      canReply: !topic.isLocked && !topic.deletedAt,
      canModerate: actor.role === UserRole.ADMIN
    },
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString()
  };
}

async function getTopicByIdOrThrow(topicId: string) {
  const topic = await prisma.forumTopic.findUnique({
    where: {
      id: topicId
    },
    include: topicDetailInclude
  });

  if (!topic) {
    throw new HttpError(404, "Forum topic not found");
  }

  return topic;
}

async function resolveVotedReplyIds(actorUserId: string, replyIds: string[]) {
  if (replyIds.length === 0) return new Set<string>();
  const rows = await prisma.forumReplyUsefulVote.findMany({
    where: {
      userId: actorUserId,
      replyId: {
        in: replyIds
      }
    },
    select: {
      replyId: true
    }
  });

  return new Set(rows.map((item) => item.replyId));
}

export async function listForumCategories() {
  await ensureDefaultForumCategories();

  const rows = await prisma.forumCategory.findMany({
    where: {
      isActive: true
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          topics: true
        }
      }
    }
  });

  return rows.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description ?? null,
    sortOrder: item.sortOrder,
    stats: {
      topicsCount: item._count.topics
    }
  }));
}

export async function listForumTopics(actor: ForumActor, query: ListTopicsQueryInput) {
  await ensureDefaultForumCategories();

  const where: Prisma.ForumTopicWhereInput = {
    deletedAt: null
  };

  if (query.category) {
    where.category = {
      slug: query.category
    };
  }

  if (query.mine) {
    where.authorId = actor.id;
  }

  if (query.tag) {
    where.tags = {
      has: query.tag.toLowerCase()
    };
  }

  if (query.q) {
    where.OR = [
      {
        title: {
          contains: query.q,
          mode: "insensitive"
        }
      },
      {
        body: {
          contains: query.q,
          mode: "insensitive"
        }
      }
    ];
  }

  const rows = await prisma.forumTopic.findMany({
    where,
    take: query.limit,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: topicListInclude
  });

  return rows.map((item) => serializeTopicListItem(actor, item));
}

export async function getForumTopicById(actor: ForumActor, topicId: string) {
  const topic = await getTopicByIdOrThrow(topicId);

  if (topic.deletedAt && actor.role !== UserRole.ADMIN) {
    throw new HttpError(404, "Forum topic not found");
  }

  const replyIds = topic.replies.map((reply) => reply.id);
  const votedReplyIds = await resolveVotedReplyIds(actor.id, replyIds);
  return serializeTopicDetail(actor, topic, votedReplyIds);
}

export async function createForumTopic(actor: ForumActor, input: CreateTopicInput) {
  await ensureDefaultForumCategories();

  const category = await prisma.forumCategory.findFirst({
    where: {
      slug: input.categorySlug,
      isActive: true
    },
    select: {
      id: true
    }
  });

  if (!category) {
    throw new HttpError(404, "Forum category not found");
  }

  const created = await prisma.forumTopic.create({
    data: {
      categoryId: category.id,
      authorId: actor.id,
      title: input.title,
      body: input.body,
      tags: uniqueNormalizedTags(input.tags)
    },
    select: {
      id: true
    }
  });

  return getForumTopicById(actor, created.id);
}

export async function createForumReply(actor: ForumActor, topicId: string, input: CreateReplyInput) {
  const topic = await prisma.forumTopic.findUnique({
    where: {
      id: topicId
    },
    select: {
      id: true,
      isLocked: true,
      deletedAt: true
    }
  });

  if (!topic || topic.deletedAt) {
    throw new HttpError(404, "Forum topic not found");
  }

  if (topic.isLocked && actor.role !== UserRole.ADMIN) {
    throw new HttpError(409, "Forum topic is locked");
  }

  if (input.quotedReplyId) {
    const quoted = await prisma.forumReply.findFirst({
      where: {
        id: input.quotedReplyId,
        topicId,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!quoted) {
      throw new HttpError(404, "Quoted reply not found");
    }
  }

  const created = await prisma.forumReply.create({
    data: {
      topicId,
      authorId: actor.id,
      body: input.body,
      quotedReplyId: input.quotedReplyId
    },
    select: {
      id: true
    }
  });

  const reply = await prisma.forumReply.findUnique({
    where: {
      id: created.id
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          socialProfile: {
            select: {
              handle: true,
              avatarUrl: true
            }
          },
          ownerProfile: {
            select: {
              avatarUrl: true
            }
          }
        }
      },
      quotedReply: {
        select: {
          id: true,
          body: true,
          author: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      _count: {
        select: {
          usefulVotes: true
        }
      }
    }
  });

  if (!reply) {
    throw new HttpError(404, "Forum reply not found");
  }

  return {
    id: reply.id,
    body: reply.body,
    author: forumUserSummary(reply.author),
    quotedReply: reply.quotedReply
      ? {
          id: reply.quotedReply.id,
          bodyExcerpt:
            reply.quotedReply.body.length > 180
              ? `${reply.quotedReply.body.slice(0, 180)}...`
              : reply.quotedReply.body,
          authorName:
            fullName(reply.quotedReply.author.firstName, reply.quotedReply.author.lastName) ||
            "Usuario Kumpa"
        }
      : null,
    metrics: {
      usefulVotes: reply._count.usefulVotes
    },
    viewer: {
      votedUseful: false,
      isAuthor: reply.authorId === actor.id,
      canModerate: actor.role === UserRole.ADMIN
    },
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString()
  };
}

export async function voteForumReplyUseful(actor: ForumActor, replyId: string) {
  const reply = await prisma.forumReply.findUnique({
    where: {
      id: replyId
    },
    include: {
      topic: {
        select: {
          deletedAt: true
        }
      }
    }
  });

  if (!reply || reply.deletedAt || reply.topic.deletedAt) {
    throw new HttpError(404, "Forum reply not found");
  }

  await prisma.forumReplyUsefulVote.upsert({
    where: {
      replyId_userId: {
        replyId,
        userId: actor.id
      }
    },
    create: {
      replyId,
      userId: actor.id
    },
    update: {}
  });

  const usefulCount = await prisma.forumReplyUsefulVote.count({
    where: {
      replyId
    }
  });

  return {
    replyId,
    usefulCount,
    votedUseful: true
  };
}

export async function unvoteForumReplyUseful(actor: ForumActor, replyId: string) {
  await prisma.forumReplyUsefulVote.deleteMany({
    where: {
      replyId,
      userId: actor.id
    }
  });

  const usefulCount = await prisma.forumReplyUsefulVote.count({
    where: {
      replyId
    }
  });

  return {
    replyId,
    usefulCount,
    votedUseful: false
  };
}

export async function moderateForumTopic(actor: ForumActor, topicId: string, input: ModerateTopicInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can moderate forum topics");
  }

  await prisma.forumTopic.update({
    where: {
      id: topicId
    },
    data: {
      isPinned: input.isPinned,
      isLocked: input.isLocked,
      deletedAt: input.deleted === undefined ? undefined : input.deleted ? new Date() : null
    }
  });

  return getForumTopicById(actor, topicId);
}

export async function moderateForumReply(actor: ForumActor, replyId: string, input: ModerateReplyInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can moderate forum replies");
  }

  const updated = await prisma.forumReply.update({
    where: {
      id: replyId
    },
    data: {
      deletedAt: input.deleted ? new Date() : null
    },
    select: {
      id: true,
      topicId: true,
      deletedAt: true,
      updatedAt: true
    }
  });

  return {
    id: updated.id,
    topicId: updated.topicId,
    deleted: Boolean(updated.deletedAt),
    updatedAt: updated.updatedAt.toISOString()
  };
}

export async function createForumReport(actor: ForumActor, input: CreateReportInput) {
  let topicId: string | undefined;
  let replyId: string | undefined;

  if (input.targetType === ForumReportTargetType.TOPIC) {
    const topic = await prisma.forumTopic.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!topic) {
      throw new HttpError(404, "Forum topic not found");
    }

    topicId = topic.id;
  } else {
    const reply = await prisma.forumReply.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!reply) {
      throw new HttpError(404, "Forum reply not found");
    }

    replyId = reply.id;
  }

  const created = await prisma.forumReport.create({
    data: {
      reporterUserId: actor.id,
      targetType: input.targetType,
      topicId,
      replyId,
      reason: input.reason
    },
    select: {
      id: true,
      status: true,
      targetType: true,
      createdAt: true
    }
  });

  return {
    id: created.id,
    targetType: created.targetType,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  };
}

export async function listForumReports(actor: ForumActor, query: ListReportsQueryInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can list forum reports");
  }

  const where: Prisma.ForumReportWhereInput = {};

  if (query.targetType) {
    where.targetType = query.targetType;
  }

  if (query.status) {
    where.status = query.status;
  } else if (query.openOnly) {
    where.status = ForumReportStatus.OPEN;
  }

  const rows = await prisma.forumReport.findMany({
    where,
    take: query.limit,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      reporterUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      topic: {
        select: {
          id: true,
          title: true
        }
      },
      reply: {
        select: {
          id: true,
          body: true
        }
      },
      reviewedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  return rows.map((item) => ({
    id: item.id,
    targetType: item.targetType,
    reason: item.reason,
    status: item.status,
    reporter: {
      id: item.reporterUser.id,
      fullName: fullName(item.reporterUser.firstName, item.reporterUser.lastName) || "Usuario Kumpa"
    },
    target: {
      topicId: item.topic?.id ?? null,
      topicTitle: item.topic?.title ?? null,
      replyId: item.reply?.id ?? null,
      replyExcerpt: item.reply?.body ? (item.reply.body.length > 180 ? `${item.reply.body.slice(0, 180)}...` : item.reply.body) : null
    },
    review: {
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      reviewNotes: item.reviewNotes ?? null,
      reviewedBy: item.reviewedByUser
        ? {
            id: item.reviewedByUser.id,
            fullName:
              fullName(item.reviewedByUser.firstName, item.reviewedByUser.lastName) || "Admin"
          }
        : null
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }));
}

export async function reviewForumReport(
  actor: ForumActor,
  reportId: string,
  input: ReviewReportInput
) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can review forum reports");
  }

  const updated = await prisma.forumReport.update({
    where: {
      id: reportId
    },
    data: {
      status: input.status,
      reviewNotes: input.reviewNotes,
      reviewedByUserId: actor.id,
      reviewedAt: new Date()
    },
    select: {
      id: true,
      status: true,
      reviewedAt: true,
      reviewNotes: true,
      updatedAt: true
    }
  });

  return {
    id: updated.id,
    status: updated.status,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    reviewNotes: updated.reviewNotes ?? null,
    updatedAt: updated.updatedAt.toISOString()
  };
}
