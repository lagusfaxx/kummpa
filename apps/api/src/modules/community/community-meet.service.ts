import {
  PetEnergyLevel,
  Prisma,
  SocialEventStatus,
  SocialWalkInvitationStatus,
  UserRole
} from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreateGroupEventInput,
  CreateWalkChatMessageInput,
  CreateWalkInvitationInput,
  DiscoverWalksQueryInput,
  GroupEventsQueryInput,
  JoinGroupEventInput,
  ListWalkInvitationsQueryInput,
  RespondWalkInvitationInput,
  UpsertWalkProfileInput
} from "./community-meet.schemas";

interface CommunityActor {
  id: string;
  role: UserRole;
}

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateAgeMonths(birthDate?: Date | null): number | null {
  if (!birthDate) return null;

  const now = new Date();
  let months = (now.getUTCFullYear() - birthDate.getUTCFullYear()) * 12;
  months += now.getUTCMonth() - birthDate.getUTCMonth();
  if (now.getUTCDate() < birthDate.getUTCDate()) months -= 1;
  if (months < 0) months = 0;
  return months;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

const walkProfileInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          district: true,
          avatarUrl: true
        }
      }
    }
  }
} satisfies Prisma.SocialWalkProfileInclude;

type SocialWalkProfileWithUser = Prisma.SocialWalkProfileGetPayload<{
  include: typeof walkProfileInclude;
}>;

const invitationInclude = {
  fromUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          district: true,
          avatarUrl: true
        }
      }
    }
  },
  toUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          district: true,
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
      size: true,
      birthDate: true,
      primaryPhotoUrl: true,
      socialProfile: {
        select: {
          energyLevel: true,
          avatarUrl: true
        }
      }
    }
  },
  chatMessages: {
    take: 1,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      senderUser: {
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
      chatMessages: true
    }
  }
} satisfies Prisma.SocialWalkInvitationInclude;

type SocialWalkInvitationWithRelations = Prisma.SocialWalkInvitationGetPayload<{
  include: typeof invitationInclude;
}>;

const eventInclude = {
  creatorUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          district: true,
          avatarUrl: true
        }
      }
    }
  },
  attendees: {
    orderBy: {
      createdAt: "asc"
    },
    include: {
      user: {
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
      },
      pet: {
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          size: true,
          birthDate: true,
          primaryPhotoUrl: true,
          socialProfile: {
            select: {
              energyLevel: true,
              avatarUrl: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.SocialGroupEventInclude;

type SocialGroupEventWithRelations = Prisma.SocialGroupEventGetPayload<{
  include: typeof eventInclude;
}>;

function userSummary(
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    city: string | null;
    ownerProfile?: { district: string | null; avatarUrl: string | null } | null;
    socialProfile?: { handle: string | null; avatarUrl: string | null } | null;
  },
  actorId?: string
) {
  const name = fullName(user.firstName, user.lastName);

  return {
    id: user.id,
    fullName: name || "Cuenta pet",
    handle: user.socialProfile?.handle ?? null,
    avatarUrl: user.socialProfile?.avatarUrl ?? user.ownerProfile?.avatarUrl ?? null,
    city: user.city ?? null,
    district: user.ownerProfile?.district ?? null,
    isMe: actorId ? user.id === actorId : false
  };
}

function buildWalkProfileDefaults(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  ownerProfile: {
    district: string | null;
  } | null;
}) {
  const defaultName = fullName(user.firstName, user.lastName) || null;
  return {
    userId: user.id,
    displayName: defaultName,
    city: user.city ?? undefined,
    district: user.ownerProfile?.district ?? undefined
  };
}

async function ensureWalkProfile(actorUserId: string) {
  const actor = await prisma.user.findUnique({
    where: {
      id: actorUserId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      city: true,
      ownerProfile: {
        select: {
          district: true
        }
      }
    }
  });

  if (!actor) {
    throw new HttpError(404, "User not found");
  }

  const defaults = buildWalkProfileDefaults(actor);
  await prisma.socialWalkProfile.upsert({
    where: {
      userId: actorUserId
    },
    create: defaults,
    update: {
      displayName: defaults.displayName ?? undefined,
      city: defaults.city,
      district: defaults.district
    }
  });
}

function serializeWalkProfile(profile: SocialWalkProfileWithUser, actorId: string) {
  return {
    id: profile.id,
    displayName:
      profile.displayName ||
      fullName(profile.user.firstName, profile.user.lastName) ||
      "Cuenta pet",
    bio: profile.bio ?? null,
    city: profile.city ?? profile.user.city ?? null,
    district: profile.district ?? profile.user.ownerProfile?.district ?? null,
    location: {
      latitude: decimalToNumber(profile.latitude),
      longitude: decimalToNumber(profile.longitude)
    },
    preferences: {
      species: profile.preferredSpecies ?? null,
      sizes: profile.preferredSizes,
      energyLevels: profile.preferredEnergyLevels,
      minAgeMonths: profile.preferredMinAgeMonths ?? null,
      maxAgeMonths: profile.preferredMaxAgeMonths ?? null
    },
    isDiscoverable: profile.isDiscoverable,
    user: userSummary(profile.user, actorId),
    viewer: {
      isMe: profile.userId === actorId,
      canEdit: profile.userId === actorId
    },
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function serializeInvitation(actorId: string, invitation: SocialWalkInvitationWithRelations) {
  const otherUser = invitation.fromUserId === actorId ? invitation.toUser : invitation.fromUser;
  const canRespond = invitation.toUserId === actorId && invitation.status === SocialWalkInvitationStatus.PENDING;
  const canCancel =
    invitation.status === SocialWalkInvitationStatus.PENDING &&
    (invitation.toUserId === actorId || invitation.fromUserId === actorId);

  const canChat =
    (invitation.status === SocialWalkInvitationStatus.PENDING ||
      invitation.status === SocialWalkInvitationStatus.ACCEPTED) &&
    (invitation.toUserId === actorId || invitation.fromUserId === actorId);

  return {
    id: invitation.id,
    status: invitation.status,
    message: invitation.message ?? null,
    proposedAt: invitation.proposedAt?.toISOString() ?? null,
    location: {
      city: invitation.city ?? null,
      district: invitation.district ?? null,
      placeLabel: invitation.placeLabel ?? null
    },
    fromUser: userSummary(invitation.fromUser, actorId),
    toUser: userSummary(invitation.toUser, actorId),
    otherUser: userSummary(otherUser, actorId),
    pet: invitation.pet
      ? {
          id: invitation.pet.id,
          name: invitation.pet.name,
          species: invitation.pet.species,
          breed: invitation.pet.breed,
          size: invitation.pet.size,
          ageMonths: calculateAgeMonths(invitation.pet.birthDate),
          energyLevel: invitation.pet.socialProfile?.energyLevel ?? PetEnergyLevel.MEDIUM,
          avatarUrl: invitation.pet.socialProfile?.avatarUrl ?? invitation.pet.primaryPhotoUrl ?? null
        }
      : null,
    metrics: {
      chatMessages: invitation._count.chatMessages
    },
    lastMessage: invitation.chatMessages[0]
      ? {
          id: invitation.chatMessages[0].id,
          body: invitation.chatMessages[0].body,
          createdAt: invitation.chatMessages[0].createdAt.toISOString(),
          sender: {
            id: invitation.chatMessages[0].senderUser.id,
            fullName:
              fullName(
                invitation.chatMessages[0].senderUser.firstName,
                invitation.chatMessages[0].senderUser.lastName
              ) || "Cuenta pet"
          }
        }
      : null,
    permissions: {
      canRespond,
      canCancel,
      canChat
    },
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null
  };
}

function serializeEvent(actorId: string, event: SocialGroupEventWithRelations) {
  const joinedByMe = event.attendees.some((attendee) => attendee.userId === actorId);
  const attendeeCount = event.attendees.length;
  const hasCapacity = event.maxAttendees === null || attendeeCount < event.maxAttendees;
  const canJoin =
    (event.status === SocialEventStatus.OPEN || event.status === SocialEventStatus.FULL) &&
    hasCapacity &&
    !joinedByMe;
  const canLeave = joinedByMe && event.creatorUserId !== actorId;
  const canEdit = event.creatorUserId === actorId;

  return {
    id: event.id,
    title: event.title,
    description: event.description ?? null,
    type: event.type,
    status: event.status,
    location: {
      city: event.city,
      district: event.district ?? null,
      placeLabel: event.placeLabel ?? null
    },
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    maxAttendees: event.maxAttendees,
    filters: {
      species: event.speciesFilter ?? null,
      size: event.sizeFilter ?? null,
      energyLevel: event.energyFilter ?? null,
      minAgeMonths: event.minPetAgeMonths ?? null,
      maxAgeMonths: event.maxPetAgeMonths ?? null
    },
    creator: userSummary(event.creatorUser, actorId),
    attendees: event.attendees.map((attendee) => ({
      id: attendee.id,
      joinedAt: attendee.createdAt.toISOString(),
      note: attendee.note ?? null,
      user: {
        id: attendee.user.id,
        fullName: fullName(attendee.user.firstName, attendee.user.lastName) || "Cuenta pet",
        handle: attendee.user.socialProfile?.handle ?? null,
        avatarUrl: attendee.user.socialProfile?.avatarUrl ?? attendee.user.ownerProfile?.avatarUrl ?? null
      },
      pet: attendee.pet
        ? {
            id: attendee.pet.id,
            name: attendee.pet.name,
            species: attendee.pet.species,
            breed: attendee.pet.breed,
            size: attendee.pet.size,
            ageMonths: calculateAgeMonths(attendee.pet.birthDate),
            energyLevel: attendee.pet.socialProfile?.energyLevel ?? PetEnergyLevel.MEDIUM,
            avatarUrl: attendee.pet.socialProfile?.avatarUrl ?? attendee.pet.primaryPhotoUrl ?? null
          }
        : null
    })),
    metrics: {
      attendeeCount
    },
    viewer: {
      joinedByMe,
      canJoin,
      canLeave,
      canEdit
    },
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

function assertInvitationParticipant(actor: CommunityActor, invitation: { fromUserId: string; toUserId: string }) {
  if (actor.role === UserRole.ADMIN) return;
  if (actor.id !== invitation.fromUserId && actor.id !== invitation.toUserId) {
    throw new HttpError(403, "Invitation access denied");
  }
}

function isChatEnabled(status: SocialWalkInvitationStatus) {
  return status === SocialWalkInvitationStatus.PENDING || status === SocialWalkInvitationStatus.ACCEPTED;
}

async function getInvitationForActorOrThrow(actor: CommunityActor, invitationId: string) {
  const invitation = await prisma.socialWalkInvitation.findUnique({
    where: {
      id: invitationId
    }
  });

  if (!invitation) {
    throw new HttpError(404, "Invitation not found");
  }

  assertInvitationParticipant(actor, invitation);
  return invitation;
}

async function recalculateEventStatus(eventId: string) {
  const event = await prisma.socialGroupEvent.findUnique({
    where: {
      id: eventId
    },
    select: {
      id: true,
      status: true,
      maxAttendees: true,
      _count: {
        select: {
          attendees: true
        }
      }
    }
  });

  if (!event) return;
  if (event.status === SocialEventStatus.CANCELLED || event.status === SocialEventStatus.COMPLETED) return;

  if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
    if (event.status !== SocialEventStatus.FULL) {
      await prisma.socialGroupEvent.update({
        where: {
          id: eventId
        },
        data: {
          status: SocialEventStatus.FULL
        }
      });
    }
    return;
  }

  if (event.status !== SocialEventStatus.OPEN) {
    await prisma.socialGroupEvent.update({
      where: {
        id: eventId
      },
      data: {
        status: SocialEventStatus.OPEN
      }
    });
  }
}

async function getEventByIdOrThrow(eventId: string) {
  const event = await prisma.socialGroupEvent.findUnique({
    where: {
      id: eventId
    },
    include: eventInclude
  });

  if (!event) {
    throw new HttpError(404, "Group event not found");
  }

  return event;
}

export async function getMyWalkProfile(actor: CommunityActor) {
  await ensureWalkProfile(actor.id);

  const profile = await prisma.socialWalkProfile.findUnique({
    where: {
      userId: actor.id
    },
    include: walkProfileInclude
  });

  if (!profile) {
    throw new HttpError(404, "Walk profile not found");
  }

  return serializeWalkProfile(profile, actor.id);
}

export async function upsertMyWalkProfile(actor: CommunityActor, input: UpsertWalkProfileInput) {
  await ensureWalkProfile(actor.id);

  await prisma.socialWalkProfile.upsert({
    where: {
      userId: actor.id
    },
    create: {
      userId: actor.id,
      displayName: input.displayName,
      bio: input.bio,
      city: input.city,
      district: input.district,
      latitude: input.latitude,
      longitude: input.longitude,
      preferredSpecies: input.preferredSpecies,
      preferredSizes: input.preferredSizes,
      preferredEnergyLevels: input.preferredEnergyLevels,
      preferredMinAgeMonths: input.preferredMinAgeMonths,
      preferredMaxAgeMonths: input.preferredMaxAgeMonths,
      isDiscoverable: input.isDiscoverable
    },
    update: {
      displayName: input.displayName,
      bio: input.bio,
      city: input.city,
      district: input.district,
      latitude: input.latitude,
      longitude: input.longitude,
      preferredSpecies: input.preferredSpecies,
      preferredSizes: input.preferredSizes,
      preferredEnergyLevels: input.preferredEnergyLevels,
      preferredMinAgeMonths: input.preferredMinAgeMonths,
      preferredMaxAgeMonths: input.preferredMaxAgeMonths,
      isDiscoverable: input.isDiscoverable
    }
  });

  return getMyWalkProfile(actor);
}

export async function discoverWalkCandidates(actor: CommunityActor, query: DiscoverWalksQueryInput) {
  await ensureWalkProfile(actor.id);

  const myProfile = await prisma.socialWalkProfile.findUnique({
    where: {
      userId: actor.id
    }
  });

  const targetCity = query.city ?? myProfile?.city ?? undefined;
  const targetDistrict = query.district ?? myProfile?.district ?? undefined;
  const ownerConditions: Prisma.UserWhereInput[] = [
    {
      socialWalkProfile: {
        is: {
          isDiscoverable: true
        }
      }
    }
  ];

  if (targetCity) {
    ownerConditions.push({
      city: {
        contains: targetCity,
        mode: "insensitive"
      }
    });
  }

  if (targetDistrict) {
    ownerConditions.push({
      ownerProfile: {
        is: {
          district: {
            contains: targetDistrict,
            mode: "insensitive"
          }
        }
      }
    });
  }

  const where: Prisma.PetWhereInput = {
    ownerId: {
      not: actor.id
    },
    deletedAt: null,
    isPublic: true,
    owner: {
      is: {
        AND: ownerConditions
      }
    }
  };

  if (query.species) {
    where.species = {
      contains: query.species,
      mode: "insensitive"
    };
  }

  if (query.size) {
    where.size = query.size;
  }

  const pets = await prisma.pet.findMany({
    where,
    take: Math.min(query.limit * 5, 200),
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          city: true,
          socialProfile: {
            select: {
              handle: true,
              avatarUrl: true
            }
          },
          ownerProfile: {
            select: {
              district: true,
              avatarUrl: true
            }
          },
          socialWalkProfile: true
        }
      },
      socialProfile: {
        select: {
          energyLevel: true,
          avatarUrl: true
        }
      }
    }
  });

  const filtered = pets
    .map((pet) => {
      const ageMonths = calculateAgeMonths(pet.birthDate);
      if (query.minAgeMonths !== undefined && (ageMonths === null || ageMonths < query.minAgeMonths)) {
        return null;
      }
      if (query.maxAgeMonths !== undefined && (ageMonths === null || ageMonths > query.maxAgeMonths)) {
        return null;
      }

      const energyLevel = pet.socialProfile?.energyLevel ?? PetEnergyLevel.MEDIUM;
      if (query.energyLevel && energyLevel !== query.energyLevel) {
        return null;
      }

      const ownerWalkProfile = pet.owner.socialWalkProfile;
      const reasons: string[] = [];
      let compatibilityScore = 0;

      if (
        targetCity &&
        normalizeText(targetCity).length > 0 &&
        normalizeText(pet.owner.city).includes(normalizeText(targetCity))
      ) {
        compatibilityScore += 1;
        reasons.push("misma ciudad");
      }

      if (
        targetDistrict &&
        normalizeText(targetDistrict).length > 0 &&
        normalizeText(pet.owner.ownerProfile?.district).includes(normalizeText(targetDistrict))
      ) {
        compatibilityScore += 1;
        reasons.push("misma zona");
      }

      if (
        myProfile?.preferredSpecies &&
        normalizeText(pet.species).includes(normalizeText(myProfile.preferredSpecies))
      ) {
        compatibilityScore += 1;
        reasons.push("especie compatible");
      }

      if (myProfile?.preferredSizes?.includes(pet.size)) {
        compatibilityScore += 1;
        reasons.push("tamano compatible");
      }

      if (myProfile?.preferredEnergyLevels?.includes(energyLevel)) {
        compatibilityScore += 1;
        reasons.push("energia compatible");
      }

      return {
        owner: userSummary(pet.owner, actor.id),
        pet: {
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          size: pet.size,
          ageMonths,
          energyLevel,
          avatarUrl: pet.socialProfile?.avatarUrl ?? pet.primaryPhotoUrl ?? null,
          updatedAt: pet.updatedAt.toISOString()
        },
        ownerWalkProfile: ownerWalkProfile
          ? {
              bio: ownerWalkProfile.bio ?? null,
              city: ownerWalkProfile.city ?? pet.owner.city ?? null,
              district: ownerWalkProfile.district ?? pet.owner.ownerProfile?.district ?? null,
              preferences: {
                species: ownerWalkProfile.preferredSpecies ?? null,
                sizes: ownerWalkProfile.preferredSizes,
                energyLevels: ownerWalkProfile.preferredEnergyLevels,
                minAgeMonths: ownerWalkProfile.preferredMinAgeMonths ?? null,
                maxAgeMonths: ownerWalkProfile.preferredMaxAgeMonths ?? null
              }
            }
          : null,
        match: {
          compatibilityScore,
          reasons
        }
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      if (left.match.compatibilityScore !== right.match.compatibilityScore) {
        return right.match.compatibilityScore - left.match.compatibilityScore;
      }
      return right.pet.updatedAt.localeCompare(left.pet.updatedAt);
    })
    .slice(0, query.limit);

  return filtered;
}

export async function createWalkInvitation(actor: CommunityActor, input: CreateWalkInvitationInput) {
  if (input.toUserId === actor.id) {
    throw new HttpError(400, "Cannot send an invitation to yourself");
  }

  const [targetUser, pet] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: input.toUserId
      },
      select: {
        id: true,
        socialWalkProfile: {
          select: {
            isDiscoverable: true
          }
        }
      }
    }),
    input.petId
      ? prisma.pet.findFirst({
          where: {
            id: input.petId,
            ownerId: actor.id,
            deletedAt: null
          },
          select: {
            id: true
          }
        })
      : Promise.resolve(null)
  ]);

  if (!targetUser) {
    throw new HttpError(404, "Target user not found");
  }

  if (targetUser.socialWalkProfile && !targetUser.socialWalkProfile.isDiscoverable && actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Target user is not discoverable for walk invitations");
  }

  if (input.petId && !pet) {
    throw new HttpError(404, "Pet not found for invitation");
  }

  const created = await prisma.socialWalkInvitation.create({
    data: {
      fromUserId: actor.id,
      toUserId: input.toUserId,
      petId: input.petId,
      message: input.message,
      proposedAt: input.proposedAt,
      city: input.city,
      district: input.district,
      placeLabel: input.placeLabel
    },
    include: invitationInclude
  });

  return serializeInvitation(actor.id, created);
}

export async function listWalkInvitations(actor: CommunityActor, query: ListWalkInvitationsQueryInput) {
  const where: Prisma.SocialWalkInvitationWhereInput = {};

  if (query.role === "inbox") {
    where.toUserId = actor.id;
  } else if (query.role === "sent") {
    where.fromUserId = actor.id;
  } else if (actor.role !== UserRole.ADMIN) {
    where.OR = [{ toUserId: actor.id }, { fromUserId: actor.id }];
  }

  if (query.status) {
    where.status = query.status;
  }

  const invitations = await prisma.socialWalkInvitation.findMany({
    where,
    take: query.limit,
    orderBy: {
      createdAt: "desc"
    },
    include: invitationInclude
  });

  return invitations.map((invitation) => serializeInvitation(actor.id, invitation));
}

export async function respondWalkInvitation(
  actor: CommunityActor,
  invitationId: string,
  input: RespondWalkInvitationInput
) {
  const invitation = await getInvitationForActorOrThrow(actor, invitationId);

  if (invitation.status !== SocialWalkInvitationStatus.PENDING) {
    throw new HttpError(409, "Invitation is no longer pending");
  }

  if (
    (input.status === SocialWalkInvitationStatus.ACCEPTED ||
      input.status === SocialWalkInvitationStatus.REJECTED) &&
    invitation.toUserId !== actor.id
  ) {
    throw new HttpError(403, "Only receiver can accept or reject invitation");
  }

  if (input.status === SocialWalkInvitationStatus.CANCELLED && invitation.fromUserId !== actor.id) {
    throw new HttpError(403, "Only sender can cancel invitation");
  }

  const updated = await prisma.socialWalkInvitation.update({
    where: {
      id: invitation.id
    },
    data: {
      status: input.status,
      respondedAt: new Date()
    },
    include: invitationInclude
  });

  return serializeInvitation(actor.id, updated);
}

export async function listWalkChatMessages(actor: CommunityActor, invitationId: string, limit = 80) {
  const invitation = await getInvitationForActorOrThrow(actor, invitationId);

  if (!isChatEnabled(invitation.status)) {
    throw new HttpError(409, "Chat is not available for this invitation status");
  }

  const messages = await prisma.socialWalkChatMessage.findMany({
    where: {
      invitationId
    },
    orderBy: {
      createdAt: "asc"
    },
    take: Math.min(Math.max(limit, 1), 200),
    include: {
      senderUser: {
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

  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sender: {
      id: message.senderUser.id,
      fullName: fullName(message.senderUser.firstName, message.senderUser.lastName) || "Cuenta pet",
      handle: message.senderUser.socialProfile?.handle ?? null,
      avatarUrl: message.senderUser.socialProfile?.avatarUrl ?? message.senderUser.ownerProfile?.avatarUrl ?? null,
      isMe: message.senderUser.id === actor.id
    }
  }));
}

export async function createWalkChatMessage(
  actor: CommunityActor,
  invitationId: string,
  input: CreateWalkChatMessageInput
) {
  const invitation = await getInvitationForActorOrThrow(actor, invitationId);

  if (!isChatEnabled(invitation.status)) {
    throw new HttpError(409, "Chat is not available for this invitation status");
  }

  const created = await prisma.socialWalkChatMessage.create({
    data: {
      invitationId: invitation.id,
      senderUserId: actor.id,
      body: input.body
    },
    include: {
      senderUser: {
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

  return {
    id: created.id,
    body: created.body,
    createdAt: created.createdAt.toISOString(),
    sender: {
      id: created.senderUser.id,
      fullName: fullName(created.senderUser.firstName, created.senderUser.lastName) || "Cuenta pet",
      handle: created.senderUser.socialProfile?.handle ?? null,
      avatarUrl: created.senderUser.socialProfile?.avatarUrl ?? created.senderUser.ownerProfile?.avatarUrl ?? null,
      isMe: created.senderUser.id === actor.id
    }
  };
}

export async function createGroupEvent(actor: CommunityActor, input: CreateGroupEventInput) {
  const created = await prisma.socialGroupEvent.create({
    data: {
      creatorUserId: actor.id,
      title: input.title,
      description: input.description,
      type: input.type,
      city: input.city,
      district: input.district,
      placeLabel: input.placeLabel,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      maxAttendees: input.maxAttendees,
      speciesFilter: input.speciesFilter,
      sizeFilter: input.sizeFilter,
      energyFilter: input.energyFilter,
      minPetAgeMonths: input.minPetAgeMonths,
      maxPetAgeMonths: input.maxPetAgeMonths,
      attendees: {
        create: {
          userId: actor.id
        }
      }
    },
    include: eventInclude
  });

  await recalculateEventStatus(created.id);
  const refreshed = await getEventByIdOrThrow(created.id);
  return serializeEvent(actor.id, refreshed);
}

export async function listGroupEvents(actor: CommunityActor, query: GroupEventsQueryInput) {
  const where: Prisma.SocialGroupEventWhereInput = {};

  if (!query.includePast) {
    where.startsAt = {
      gte: new Date()
    };
  }

  if (query.city) {
    where.city = {
      contains: query.city,
      mode: "insensitive"
    };
  }

  if (query.district) {
    where.district = {
      contains: query.district,
      mode: "insensitive"
    };
  }

  if (query.onlyMine) {
    where.OR = [{ creatorUserId: actor.id }, { attendees: { some: { userId: actor.id } } }];
  }

  const constraints: Prisma.SocialGroupEventWhereInput[] = [];

  if (query.species) {
    constraints.push({
      OR: [
        { speciesFilter: null },
        {
          speciesFilter: {
            contains: query.species,
            mode: "insensitive"
          }
        }
      ]
    });
  }

  if (query.size) {
    constraints.push({
      OR: [{ sizeFilter: null }, { sizeFilter: query.size }]
    });
  }

  if (query.energyLevel) {
    constraints.push({
      OR: [{ energyFilter: null }, { energyFilter: query.energyLevel }]
    });
  }

  if (query.minAgeMonths !== undefined) {
    constraints.push({
      OR: [{ maxPetAgeMonths: null }, { maxPetAgeMonths: { gte: query.minAgeMonths } }]
    });
  }

  if (query.maxAgeMonths !== undefined) {
    constraints.push({
      OR: [{ minPetAgeMonths: null }, { minPetAgeMonths: { lte: query.maxAgeMonths } }]
    });
  }

  if (constraints.length > 0) {
    where.AND = constraints;
  }

  const events = await prisma.socialGroupEvent.findMany({
    where,
    take: query.limit,
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    include: eventInclude
  });

  return events.map((event) => serializeEvent(actor.id, event));
}

export async function joinGroupEvent(actor: CommunityActor, eventId: string, input: JoinGroupEventInput) {
  const event = await getEventByIdOrThrow(eventId);

  if (event.status === SocialEventStatus.CANCELLED || event.status === SocialEventStatus.COMPLETED) {
    throw new HttpError(409, "Event is not open for joining");
  }

  if (event.startsAt <= new Date()) {
    throw new HttpError(409, "Cannot join an event that already started");
  }

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
      throw new HttpError(404, "Pet not found for event");
    }
  }

  await prisma.socialGroupEventMember.upsert({
    where: {
      eventId_userId: {
        eventId,
        userId: actor.id
      }
    },
    create: {
      eventId,
      userId: actor.id,
      petId: input.petId,
      note: input.note
    },
    update: {
      petId: input.petId,
      note: input.note
    }
  });

  await recalculateEventStatus(eventId);
  const refreshed = await getEventByIdOrThrow(eventId);
  return serializeEvent(actor.id, refreshed);
}

export async function leaveGroupEvent(actor: CommunityActor, eventId: string) {
  const event = await getEventByIdOrThrow(eventId);

  if (event.creatorUserId === actor.id) {
    throw new HttpError(400, "Event creator cannot leave. Cancel or complete event instead.");
  }

  await prisma.socialGroupEventMember.deleteMany({
    where: {
      eventId,
      userId: actor.id
    }
  });

  await recalculateEventStatus(eventId);
  const refreshed = await getEventByIdOrThrow(eventId);
  return serializeEvent(actor.id, refreshed);
}
