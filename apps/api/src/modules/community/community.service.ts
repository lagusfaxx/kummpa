import {
  Prisma,
  SocialPostVisibility,
  SocialReportStatus,
  SocialReportTargetType,
  UserRole
} from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CommunityFeedQueryInput,
  CreateCommentInput,
  CreatePostInput,
  CreateReportInput,
  FollowListQueryInput,
  ListReportsQueryInput,
  ReviewReportInput,
  SharePostInput,
  UpdateMySocialProfileInput,
  UpdatePetSocialProfileInput,
  UserPostsQueryInput
} from "./community.schemas";

interface CommunityActor {
  id: string;
  role: UserRole;
}

const postInclude = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      role: true,
      socialProfile: {
        select: {
          handle: true,
          displayName: true,
          avatarUrl: true,
          isPublic: true
        }
      },
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  },
  pet: {
    select: {
      id: true,
      name: true,
      species: true,
      breed: true,
      primaryPhotoUrl: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true,
          isPublic: true
        }
      }
    }
  },
  comments: {
    where: {
      deletedAt: null
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 3,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
      }
    }
  },
  _count: {
    select: {
      likes: true,
      saves: true,
      shares: true
    }
  }
} satisfies Prisma.SocialPostInclude;

type CommunityPostWithRelations = Prisma.SocialPostGetPayload<{
  include: typeof postInclude;
}>;

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function resolveAvatar(
  socialAvatar?: string | null,
  ownerAvatar?: string | null,
  fallbackImage?: string | null
) {
  return socialAvatar ?? ownerAvatar ?? fallbackImage ?? null;
}

function serializeComment(
  comment: CommunityPostWithRelations["comments"][number],
  actor: CommunityActor,
  postAuthorId: string
) {
  const authorName =
    fullName(comment.author.firstName, comment.author.lastName) || "Usuario Kumpa";

  return {
    id: comment.id,
    body: comment.body,
    author: {
      id: comment.author.id,
      fullName: authorName,
      handle: comment.author.socialProfile?.handle ?? null,
      avatarUrl: resolveAvatar(
        comment.author.socialProfile?.avatarUrl,
        comment.author.ownerProfile?.avatarUrl
      )
    },
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    permissions: {
      canDelete:
        actor.role === UserRole.ADMIN ||
        actor.id === comment.authorId ||
        actor.id === postAuthorId
    }
  };
}

function serializePost(input: {
  actor: CommunityActor;
  post: CommunityPostWithRelations;
  commentsCount: number;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  followingAuthorIds: Set<string>;
}) {
  const { actor, post, commentsCount, likedPostIds, savedPostIds, followingAuthorIds } = input;
  const authorName =
    post.author.socialProfile?.displayName ||
    fullName(post.author.firstName, post.author.lastName) ||
    "Usuario Kumpa";
  const isMine = post.authorId === actor.id;

  return {
    id: post.id,
    body: post.body,
    imageUrl: post.imageUrl,
    visibility: post.visibility,
    allowComments: post.allowComments,
    author: {
      id: post.author.id,
      fullName: authorName,
      handle: post.author.socialProfile?.handle ?? null,
      city: post.author.city ?? null,
      role: post.author.role,
      avatarUrl: resolveAvatar(post.author.socialProfile?.avatarUrl, post.author.ownerProfile?.avatarUrl),
      isFollowedByMe: followingAuthorIds.has(post.author.id)
    },
    pet: post.pet
      ? {
          id: post.pet.id,
          name: post.pet.name,
          species: post.pet.species,
          breed: post.pet.breed,
          avatarUrl: resolveAvatar(post.pet.socialProfile?.avatarUrl, undefined, post.pet.primaryPhotoUrl),
          handle: post.pet.socialProfile?.handle ?? null
        }
      : null,
    metrics: {
      likesCount: post._count.likes,
      commentsCount,
      savesCount: post._count.saves,
      sharesCount: post._count.shares
    },
    viewer: {
      liked: likedPostIds.has(post.id),
      saved: savedPostIds.has(post.id),
      canEdit: isMine,
      canDelete: isMine || actor.role === UserRole.ADMIN,
      canComment: post.allowComments,
      canReport: !isMine
    },
    commentsPreview: post.comments.map((comment) => serializeComment(comment, actor, post.authorId)),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString()
  };
}

function isReportAdmin(actor: CommunityActor) {
  return actor.role === UserRole.ADMIN;
}

async function getFollowingIdSet(userId: string) {
  const rows = await prisma.socialFollow.findMany({
    where: {
      followerId: userId
    },
    select: {
      followingId: true
    }
  });

  return new Set(rows.map((row) => row.followingId));
}

function canViewPost(
  actor: CommunityActor,
  post: Pick<CommunityPostWithRelations, "authorId" | "visibility" | "deletedAt">,
  followingAuthorIds: Set<string>
) {
  if (post.deletedAt) return false;
  if (post.authorId === actor.id) return true;
  if (post.visibility === SocialPostVisibility.PUBLIC) return true;
  if (post.visibility === SocialPostVisibility.FOLLOWERS && followingAuthorIds.has(post.authorId)) {
    return true;
  }
  return false;
}

async function getCommentCounts(postIds: string[]) {
  if (postIds.length === 0) {
    return new Map<string, number>();
  }

  const grouped = await prisma.socialPostComment.groupBy({
    by: ["postId"],
    where: {
      postId: {
        in: postIds
      },
      deletedAt: null
    },
    _count: {
      _all: true
    }
  });

  return new Map(grouped.map((item) => [item.postId, item._count._all]));
}

async function getViewerInteractionSets(actorId: string, postIds: string[]) {
  if (postIds.length === 0) {
    return {
      likedPostIds: new Set<string>(),
      savedPostIds: new Set<string>()
    };
  }

  const [likes, saves] = await Promise.all([
    prisma.socialPostLike.findMany({
      where: {
        userId: actorId,
        postId: {
          in: postIds
        }
      },
      select: {
        postId: true
      }
    }),
    prisma.socialPostSave.findMany({
      where: {
        userId: actorId,
        postId: {
          in: postIds
        }
      },
      select: {
        postId: true
      }
    })
  ]);

  return {
    likedPostIds: new Set(likes.map((item) => item.postId)),
    savedPostIds: new Set(saves.map((item) => item.postId))
  };
}

function buildVisibilityWhere(
  actor: CommunityActor,
  followingAuthorIds: Set<string>
): Prisma.SocialPostWhereInput {
  const allowed: Prisma.SocialPostWhereInput[] = [
    {
      authorId: actor.id
    },
    {
      visibility: SocialPostVisibility.PUBLIC
    }
  ];

  const followingIds = Array.from(followingAuthorIds);
  if (followingIds.length > 0) {
    allowed.push({
      visibility: SocialPostVisibility.FOLLOWERS,
      authorId: {
        in: followingIds
      }
    });
  }

  return {
    OR: allowed
  };
}

function buildFeedWhere(
  actor: CommunityActor,
  followingAuthorIds: Set<string>,
  query: CommunityFeedQueryInput
): Prisma.SocialPostWhereInput {
  const conditions: Prisma.SocialPostWhereInput[] = [
    {
      deletedAt: null
    }
  ];

  if (query.mode === "mine") {
    conditions.push({
      authorId: actor.id
    });
  } else if (query.mode === "following") {
    const followingIds = Array.from(followingAuthorIds);
    if (followingIds.length === 0) {
      conditions.push({
        id: "__none__"
      });
    } else {
      conditions.push({
        OR: [
          {
            authorId: actor.id
          },
          {
            authorId: {
              in: followingIds
            },
            visibility: {
              in: [SocialPostVisibility.PUBLIC, SocialPostVisibility.FOLLOWERS]
            }
          }
        ]
      });
    }
  } else if (query.mode === "saved") {
    conditions.push({
      saves: {
        some: {
          userId: actor.id
        }
      }
    });
    conditions.push(buildVisibilityWhere(actor, followingAuthorIds));
  } else {
    conditions.push(buildVisibilityWhere(actor, followingAuthorIds));
  }

  if (query.authorId) {
    conditions.push({
      authorId: query.authorId
    });
  }

  if (query.petId) {
    conditions.push({
      petId: query.petId
    });
  }

  if (query.q) {
    conditions.push({
      OR: [
        {
          body: {
            contains: query.q,
            mode: "insensitive"
          }
        },
        {
          author: {
            firstName: {
              contains: query.q,
              mode: "insensitive"
            }
          }
        },
        {
          author: {
            lastName: {
              contains: query.q,
              mode: "insensitive"
            }
          }
        },
        {
          pet: {
            name: {
              contains: query.q,
              mode: "insensitive"
            }
          }
        }
      ]
    });
  }

  return {
    AND: conditions
  };
}

async function findVisiblePostOrThrow(actor: CommunityActor, postId: string) {
  const followingAuthorIds = await getFollowingIdSet(actor.id);
  const post = await prisma.socialPost.findUnique({
    where: {
      id: postId
    },
    include: postInclude
  });

  if (!post || post.deletedAt) {
    throw new HttpError(404, "Social post not found");
  }

  if (!canViewPost(actor, post, followingAuthorIds)) {
    throw new HttpError(403, "You do not have access to this post");
  }

  return {
    post,
    followingAuthorIds
  };
}

async function serializeSinglePost(actor: CommunityActor, post: CommunityPostWithRelations) {
  const [followingAuthorIds, interactionSets, commentCounts] = await Promise.all([
    getFollowingIdSet(actor.id),
    getViewerInteractionSets(actor.id, [post.id]),
    getCommentCounts([post.id])
  ]);

  return serializePost({
    actor,
    post,
    commentsCount: commentCounts.get(post.id) ?? 0,
    likedPostIds: interactionSets.likedPostIds,
    savedPostIds: interactionSets.savedPostIds,
    followingAuthorIds
  });
}

export async function listCommunityFeed(actor: CommunityActor, query: CommunityFeedQueryInput) {
  const followingAuthorIds = await getFollowingIdSet(actor.id);
  const where = buildFeedWhere(actor, followingAuthorIds, query);

  const posts = await prisma.socialPost.findMany({
    where,
    include: postInclude,
    orderBy: [{ createdAt: "desc" }],
    take: query.limit
  });

  const postIds = posts.map((post) => post.id);
  const [interactionSets, commentCounts] = await Promise.all([
    getViewerInteractionSets(actor.id, postIds),
    getCommentCounts(postIds)
  ]);

  return posts.map((post) =>
    serializePost({
      actor,
      post,
      commentsCount: commentCounts.get(post.id) ?? 0,
      likedPostIds: interactionSets.likedPostIds,
      savedPostIds: interactionSets.savedPostIds,
      followingAuthorIds
    })
  );
}

export async function createCommunityPost(actor: CommunityActor, input: CreatePostInput) {
  if (input.petId) {
    const pet = await prisma.pet.findFirst({
      where: {
        id: input.petId,
        ownerId: actor.id,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!pet) {
      throw new HttpError(404, "Pet not found for social post");
    }
  }

  const created = await prisma.socialPost.create({
    data: {
      authorId: actor.id,
      petId: input.petId,
      body: input.body,
      imageUrl: input.imageUrl,
      visibility: input.visibility,
      allowComments: input.allowComments
    },
    include: postInclude
  });

  return serializeSinglePost(actor, created);
}

export async function getCommunityPostById(actor: CommunityActor, postId: string) {
  const { post } = await findVisiblePostOrThrow(actor, postId);
  return serializeSinglePost(actor, post);
}

export async function deleteCommunityPost(actor: CommunityActor, postId: string) {
  const post = await prisma.socialPost.findUnique({
    where: {
      id: postId
    },
    select: {
      id: true,
      authorId: true,
      deletedAt: true
    }
  });

  if (!post || post.deletedAt) {
    throw new HttpError(404, "Social post not found");
  }

  if (post.authorId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only author or admin can delete this post");
  }

  await prisma.socialPost.update({
    where: {
      id: postId
    },
    data: {
      deletedAt: new Date()
    }
  });
}

async function getPostInteractionSnapshot(actorId: string, postId: string) {
  const [likesCount, savesCount, sharesCount, commentsCount, likedByMe, savedByMe] =
    await Promise.all([
      prisma.socialPostLike.count({
        where: { postId }
      }),
      prisma.socialPostSave.count({
        where: { postId }
      }),
      prisma.socialPostShare.count({
        where: { postId }
      }),
      prisma.socialPostComment.count({
        where: { postId, deletedAt: null }
      }),
      prisma.socialPostLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId: actorId
          }
        },
        select: {
          id: true
        }
      }),
      prisma.socialPostSave.findUnique({
        where: {
          postId_userId: {
            postId,
            userId: actorId
          }
        },
        select: {
          id: true
        }
      })
    ]);

  return {
    likesCount,
    savesCount,
    sharesCount,
    commentsCount,
    liked: Boolean(likedByMe),
    saved: Boolean(savedByMe)
  };
}

export async function likeCommunityPost(actor: CommunityActor, postId: string) {
  await findVisiblePostOrThrow(actor, postId);
  await prisma.socialPostLike.upsert({
    where: {
      postId_userId: {
        postId,
        userId: actor.id
      }
    },
    update: {},
    create: {
      postId,
      userId: actor.id
    }
  });

  return getPostInteractionSnapshot(actor.id, postId);
}

export async function unlikeCommunityPost(actor: CommunityActor, postId: string) {
  await findVisiblePostOrThrow(actor, postId);
  await prisma.socialPostLike.deleteMany({
    where: {
      postId,
      userId: actor.id
    }
  });

  return getPostInteractionSnapshot(actor.id, postId);
}

export async function saveCommunityPost(actor: CommunityActor, postId: string) {
  await findVisiblePostOrThrow(actor, postId);
  await prisma.socialPostSave.upsert({
    where: {
      postId_userId: {
        postId,
        userId: actor.id
      }
    },
    update: {},
    create: {
      postId,
      userId: actor.id
    }
  });

  return getPostInteractionSnapshot(actor.id, postId);
}

export async function unsaveCommunityPost(actor: CommunityActor, postId: string) {
  await findVisiblePostOrThrow(actor, postId);
  await prisma.socialPostSave.deleteMany({
    where: {
      postId,
      userId: actor.id
    }
  });

  return getPostInteractionSnapshot(actor.id, postId);
}

export async function shareCommunityPost(actor: CommunityActor, postId: string, input: SharePostInput) {
  await findVisiblePostOrThrow(actor, postId);
  await prisma.socialPostShare.create({
    data: {
      postId,
      userId: actor.id,
      channel: input.channel ?? "internal"
    }
  });

  return getPostInteractionSnapshot(actor.id, postId);
}

export async function addCommunityComment(
  actor: CommunityActor,
  postId: string,
  input: CreateCommentInput
) {
  const { post } = await findVisiblePostOrThrow(actor, postId);
  if (!post.allowComments) {
    throw new HttpError(409, "Comments are disabled for this post");
  }

  const created = await prisma.socialPostComment.create({
    data: {
      postId,
      authorId: actor.id,
      body: input.body
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
      }
    }
  });

  return serializeComment(
    {
      ...created,
      deletedAt: null
    },
    actor,
    post.authorId
  );
}

export async function deleteCommunityComment(actor: CommunityActor, postId: string, commentId: string) {
  const comment = await prisma.socialPostComment.findFirst({
    where: {
      id: commentId,
      postId,
      deletedAt: null
    },
    include: {
      post: {
        select: {
          authorId: true
        }
      }
    }
  });

  if (!comment) {
    throw new HttpError(404, "Comment not found");
  }

  const canDelete =
    actor.role === UserRole.ADMIN || actor.id === comment.authorId || actor.id === comment.post.authorId;

  if (!canDelete) {
    throw new HttpError(403, "You cannot delete this comment");
  }

  await prisma.socialPostComment.update({
    where: {
      id: commentId
    },
    data: {
      deletedAt: new Date()
    }
  });
}

function handleFromUser(user: {
  firstName?: string | null;
  lastName?: string | null;
  id: string;
}) {
  const first = user.firstName?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const last = user.lastName?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const base = [first, last].filter(Boolean).join("_");
  const fallback = user.id.slice(-6).toLowerCase();
  return (base || `kumpa_${fallback}`).slice(0, 28);
}

async function buildSocialProfilePayload(actorUserId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: actorUserId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true
    }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const displayName = fullName(user.firstName, user.lastName) || "Usuario Kumpa";

  return {
    displayName,
    handle: handleFromUser(user),
    city: user.city ?? undefined
  };
}

async function ensureMySocialProfile(actorUserId: string) {
  const defaults = await buildSocialProfilePayload(actorUserId);

  return prisma.socialProfile.upsert({
    where: {
      userId: actorUserId
    },
    update: {},
    create: {
      userId: actorUserId,
      displayName: defaults.displayName,
      handle: defaults.handle,
      city: defaults.city,
      isPublic: true
    }
  });
}

async function getProfileBase(targetUserId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      deletedAt: null
    },
    include: {
      socialProfile: true,
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  });

  if (!user) {
    throw new HttpError(404, "User profile not found");
  }

  return user;
}

export async function getMyCommunityProfile(actor: CommunityActor) {
  await ensureMySocialProfile(actor.id);
  return getCommunityProfileByUserId(actor, actor.id);
}

export async function updateMyCommunityProfile(
  actor: CommunityActor,
  input: UpdateMySocialProfileInput
) {
  try {
    await prisma.socialProfile.upsert({
      where: {
        userId: actor.id
      },
      update: {
        handle: input.handle,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        coverUrl: input.coverUrl,
        bio: input.bio,
        city: input.city,
        isPublic: input.isPublic
      },
      create: {
        userId: actor.id,
        handle: input.handle,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        coverUrl: input.coverUrl,
        bio: input.bio,
        city: input.city,
        isPublic: input.isPublic ?? true
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Handle is already in use");
    }
    throw error;
  }

  return getCommunityProfileByUserId(actor, actor.id);
}

export async function getCommunityProfileByUserId(actor: CommunityActor, targetUserId: string) {
  const [user, followByMe, postsCount, followersCount, followingCount] = await Promise.all([
    getProfileBase(targetUserId),
    targetUserId === actor.id
      ? Promise.resolve(null)
      : prisma.socialFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: actor.id,
              followingId: targetUserId
            }
          },
          select: {
            id: true
          }
        }),
    prisma.socialPost.count({
      where: {
        authorId: targetUserId,
        deletedAt: null
      }
    }),
    prisma.socialFollow.count({
      where: {
        followingId: targetUserId
      }
    }),
    prisma.socialFollow.count({
      where: {
        followerId: targetUserId
      }
    })
  ]);

  const defaultName = fullName(user.firstName, user.lastName) || "Usuario Kumpa";
  const profileIsPublic = user.socialProfile?.isPublic ?? true;
  const isMe = actor.id === targetUserId;
  const isFollowing = Boolean(followByMe);
  const canViewPrivate = isMe || isFollowing || actor.role === UserRole.ADMIN;

  return {
    user: {
      id: user.id,
      role: user.role,
      fullName: defaultName,
      city: user.city ?? null
    },
    profile: {
      handle: user.socialProfile?.handle ?? null,
      displayName: user.socialProfile?.displayName ?? defaultName,
      avatarUrl: resolveAvatar(user.socialProfile?.avatarUrl, user.ownerProfile?.avatarUrl),
      coverUrl: user.socialProfile?.coverUrl ?? null,
      bio: user.socialProfile?.bio ?? null,
      city: user.socialProfile?.city ?? user.city ?? null,
      isPublic: profileIsPublic
    },
    stats: {
      posts: postsCount,
      followers: followersCount,
      following: followingCount
    },
    viewer: {
      isMe,
      isFollowing,
      canFollow: !isMe,
      canEdit: isMe,
      canViewPrivate
    }
  };
}

export async function listCommunityUserPosts(
  actor: CommunityActor,
  targetUserId: string,
  query: UserPostsQueryInput
) {
  const feedQuery: CommunityFeedQueryInput = {
    mode: targetUserId === actor.id ? "mine" : "discover",
    authorId: targetUserId,
    limit: query.limit
  };

  return listCommunityFeed(actor, feedQuery);
}

export async function followCommunityProfile(actor: CommunityActor, targetUserId: string) {
  if (targetUserId === actor.id) {
    throw new HttpError(400, "You cannot follow yourself");
  }

  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!target) {
    throw new HttpError(404, "Target profile not found");
  }

  await prisma.socialFollow.upsert({
    where: {
      followerId_followingId: {
        followerId: actor.id,
        followingId: targetUserId
      }
    },
    update: {},
    create: {
      followerId: actor.id,
      followingId: targetUserId
    }
  });

  return getCommunityProfileByUserId(actor, targetUserId);
}

export async function unfollowCommunityProfile(actor: CommunityActor, targetUserId: string) {
  if (targetUserId === actor.id) {
    throw new HttpError(400, "You cannot unfollow yourself");
  }

  await prisma.socialFollow.deleteMany({
    where: {
      followerId: actor.id,
      followingId: targetUserId
    }
  });

  return getCommunityProfileByUserId(actor, targetUserId);
}

export async function listMyFollowingProfiles(actor: CommunityActor, query: FollowListQueryInput) {
  const rows = await prisma.socialFollow.findMany({
    where: {
      followerId: actor.id
    },
    orderBy: {
      createdAt: "desc"
    },
    take: query.limit,
    include: {
      following: {
        include: {
          socialProfile: true,
          ownerProfile: {
            select: {
              avatarUrl: true
            }
          }
        }
      }
    }
  });

  return rows.map((row) => ({
    followedAt: row.createdAt.toISOString(),
    user: {
      id: row.following.id,
      fullName:
        row.following.socialProfile?.displayName ||
        fullName(row.following.firstName, row.following.lastName) ||
        "Usuario Kumpa",
      handle: row.following.socialProfile?.handle ?? null,
      avatarUrl: resolveAvatar(
        row.following.socialProfile?.avatarUrl,
        row.following.ownerProfile?.avatarUrl
      ),
      city: row.following.city ?? null,
      role: row.following.role
    }
  }));
}

export async function listMyFollowerProfiles(actor: CommunityActor, query: FollowListQueryInput) {
  const rows = await prisma.socialFollow.findMany({
    where: {
      followingId: actor.id
    },
    orderBy: {
      createdAt: "desc"
    },
    take: query.limit,
    include: {
      follower: {
        include: {
          socialProfile: true,
          ownerProfile: {
            select: {
              avatarUrl: true
            }
          }
        }
      }
    }
  });

  return rows.map((row) => ({
    followedAt: row.createdAt.toISOString(),
    user: {
      id: row.follower.id,
      fullName:
        row.follower.socialProfile?.displayName ||
        fullName(row.follower.firstName, row.follower.lastName) ||
        "Usuario Kumpa",
      handle: row.follower.socialProfile?.handle ?? null,
      avatarUrl: resolveAvatar(row.follower.socialProfile?.avatarUrl, row.follower.ownerProfile?.avatarUrl),
      city: row.follower.city ?? null,
      role: row.follower.role
    }
  }));
}

export async function listMyPetSocialProfiles(actor: CommunityActor) {
  const pets = await prisma.pet.findMany({
    where: {
      ownerId: actor.id,
      deletedAt: null
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      socialProfile: true
    }
  });

  return pets.map((pet) => ({
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      avatarUrl: resolveAvatar(pet.socialProfile?.avatarUrl, undefined, pet.primaryPhotoUrl)
    },
    profile: {
      handle: pet.socialProfile?.handle ?? null,
      bio: pet.socialProfile?.bio ?? null,
      avatarUrl: resolveAvatar(pet.socialProfile?.avatarUrl, undefined, pet.primaryPhotoUrl),
      coverUrl: pet.socialProfile?.coverUrl ?? null,
      isPublic: pet.socialProfile?.isPublic ?? false
    }
  }));
}

export async function getPetSocialProfile(actor: CommunityActor, petId: string) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      deletedAt: null
    },
    include: {
      socialProfile: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  const isOwner = pet.ownerId === actor.id;
  const isAdmin = actor.role === UserRole.ADMIN;
  const hasProfile = Boolean(pet.socialProfile);

  if (!hasProfile && !isOwner && !isAdmin) {
    throw new HttpError(404, "Pet social profile not configured");
  }

  if (pet.socialProfile && !pet.socialProfile.isPublic && !isOwner && !isAdmin) {
    throw new HttpError(403, "Pet social profile is private");
  }

  return {
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      avatarUrl: resolveAvatar(pet.socialProfile?.avatarUrl, undefined, pet.primaryPhotoUrl),
      ownerName: fullName(pet.owner.firstName, pet.owner.lastName) || "Tutor Kumpa"
    },
    profile: {
      handle: pet.socialProfile?.handle ?? null,
      bio: pet.socialProfile?.bio ?? null,
      avatarUrl: resolveAvatar(pet.socialProfile?.avatarUrl, undefined, pet.primaryPhotoUrl),
      coverUrl: pet.socialProfile?.coverUrl ?? null,
      isPublic: pet.socialProfile?.isPublic ?? false
    },
    viewer: {
      isOwner,
      canEdit: isOwner || isAdmin
    }
  };
}

export async function upsertPetSocialProfile(
  actor: CommunityActor,
  petId: string,
  input: UpdatePetSocialProfileInput
) {
  const pet = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId: actor.id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  try {
    await prisma.petSocialProfile.upsert({
      where: {
        petId
      },
      update: {
        handle: input.handle,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        coverUrl: input.coverUrl,
        isPublic: input.isPublic
      },
      create: {
        petId,
        handle: input.handle,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        coverUrl: input.coverUrl,
        isPublic: input.isPublic ?? true
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Pet handle is already in use");
    }
    throw error;
  }

  return getPetSocialProfile(actor, petId);
}

export async function createCommunityReport(actor: CommunityActor, input: CreateReportInput) {
  let createData: Prisma.SocialReportCreateInput | null = null;

  if (input.targetType === SocialReportTargetType.POST) {
    const post = await prisma.socialPost.findUnique({
      where: {
        id: input.targetId
      },
      select: {
        id: true,
        authorId: true,
        deletedAt: true
      }
    });

    if (!post || post.deletedAt) {
      throw new HttpError(404, "Post not found for report");
    }

    if (post.authorId === actor.id) {
      throw new HttpError(400, "You cannot report your own post");
    }

    createData = {
      targetType: SocialReportTargetType.POST,
      reason: input.reason,
      reporterUser: {
        connect: {
          id: actor.id
        }
      },
      post: {
        connect: {
          id: post.id
        }
      }
    };
  }

  if (input.targetType === SocialReportTargetType.COMMENT) {
    const comment = await prisma.socialPostComment.findUnique({
      where: {
        id: input.targetId
      },
      select: {
        id: true,
        authorId: true,
        deletedAt: true
      }
    });

    if (!comment || comment.deletedAt) {
      throw new HttpError(404, "Comment not found for report");
    }

    if (comment.authorId === actor.id) {
      throw new HttpError(400, "You cannot report your own comment");
    }

    createData = {
      targetType: SocialReportTargetType.COMMENT,
      reason: input.reason,
      reporterUser: {
        connect: {
          id: actor.id
        }
      },
      comment: {
        connect: {
          id: comment.id
        }
      }
    };
  }

  if (input.targetType === SocialReportTargetType.PROFILE) {
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    if (!targetUser) {
      throw new HttpError(404, "Profile not found for report");
    }

    if (targetUser.id === actor.id) {
      throw new HttpError(400, "You cannot report your own profile");
    }

    createData = {
      targetType: SocialReportTargetType.PROFILE,
      reason: input.reason,
      reporterUser: {
        connect: {
          id: actor.id
        }
      },
      reportedUser: {
        connect: {
          id: targetUser.id
        }
      }
    };
  }

  if (!createData) {
    throw new HttpError(400, "Unsupported report target");
  }

  const created = await prisma.socialReport.create({
    data: createData
  });

  return {
    id: created.id,
    targetType: created.targetType,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  };
}

export async function listCommunityReports(actor: CommunityActor, query: ListReportsQueryInput) {
  if (!isReportAdmin(actor)) {
    throw new HttpError(403, "Only admins can access reports");
  }

  const where: Prisma.SocialReportWhereInput = {};

  if (query.status) {
    where.status = query.status;
  } else if (query.openOnly) {
    where.status = SocialReportStatus.OPEN;
  }

  if (query.targetType) {
    where.targetType = query.targetType;
  }

  const reports = await prisma.socialReport.findMany({
    where,
    include: {
      reporterUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      reviewedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      post: {
        select: {
          id: true,
          body: true
        }
      },
      comment: {
        select: {
          id: true,
          body: true
        }
      },
      reportedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: query.limit
  });

  return reports.map((report) => ({
    id: report.id,
    targetType: report.targetType,
    reason: report.reason,
    status: report.status,
    reporter: {
      id: report.reporterUser.id,
      fullName:
        fullName(report.reporterUser.firstName, report.reporterUser.lastName) || "Usuario Kumpa"
    },
    target: report.targetType === SocialReportTargetType.POST
      ? {
          postId: report.post?.id ?? null,
          excerpt: report.post?.body?.slice(0, 140) ?? null
        }
      : report.targetType === SocialReportTargetType.COMMENT
        ? {
            commentId: report.comment?.id ?? null,
            excerpt: report.comment?.body?.slice(0, 140) ?? null
          }
        : {
            userId: report.reportedUser?.id ?? null,
            fullName: report.reportedUser
              ? fullName(report.reportedUser.firstName, report.reportedUser.lastName) || "Usuario Kumpa"
              : null
          },
    review: {
      notes: report.reviewNotes ?? null,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      reviewedBy: report.reviewedByUser
        ? {
            id: report.reviewedByUser.id,
            fullName:
              fullName(report.reviewedByUser.firstName, report.reviewedByUser.lastName) ||
              "Admin Kumpa"
          }
        : null
    },
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString()
  }));
}

export async function reviewCommunityReport(
  actor: CommunityActor,
  reportId: string,
  input: ReviewReportInput
) {
  if (!isReportAdmin(actor)) {
    throw new HttpError(403, "Only admins can review reports");
  }

  const existing = await prisma.socialReport.findUnique({
    where: {
      id: reportId
    },
    select: {
      id: true
    }
  });

  if (!existing) {
    throw new HttpError(404, "Report not found");
  }

  const updated = await prisma.socialReport.update({
    where: {
      id: reportId
    },
    data: {
      status: input.status,
      reviewNotes: input.reviewNotes,
      reviewedAt: new Date(),
      reviewedByUserId: actor.id
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
