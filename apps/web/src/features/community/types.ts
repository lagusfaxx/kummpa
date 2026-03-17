export type SocialPostVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export type CommunityFeedMode = "discover" | "following" | "mine" | "saved";

export interface CommunityUserSummary {
  id: string;
  fullName: string;
  handle?: string | null;
  city?: string | null;
  role?: string;
  avatarUrl?: string | null;
  isFollowedByMe?: boolean;
}

export interface CommunityPetSummary {
  id: string;
  name: string;
  species: string;
  breed: string;
  avatarUrl?: string | null;
  handle?: string | null;
}

export interface CommunityComment {
  id: string;
  body: string;
  author: CommunityUserSummary;
  createdAt: string;
  updatedAt: string;
  permissions: {
    canDelete: boolean;
  };
}

export interface CommunityPost {
  id: string;
  body: string;
  imageUrl?: string | null;
  visibility: SocialPostVisibility;
  allowComments: boolean;
  author: CommunityUserSummary;
  pet?: CommunityPetSummary | null;
  metrics: {
    likesCount: number;
    commentsCount: number;
    savesCount: number;
    sharesCount: number;
  };
  viewer: {
    liked: boolean;
    saved: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canComment: boolean;
    canReport: boolean;
  };
  commentsPreview: CommunityComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityFeedQuery {
  mode?: CommunityFeedMode;
  authorId?: string;
  petId?: string;
  q?: string;
  limit?: number;
}

export interface CommunityPostCreatePayload {
  body: string;
  imageUrl?: string;
  petId?: string;
  visibility: SocialPostVisibility;
  allowComments: boolean;
}

export interface PostInteractionSnapshot {
  likesCount: number;
  savesCount: number;
  sharesCount: number;
  commentsCount: number;
  liked: boolean;
  saved: boolean;
}

export interface CommunityProfile {
  user: {
    id: string;
    role: string;
    fullName: string;
    city?: string | null;
  };
  profile: {
    handle?: string | null;
    displayName: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    bio?: string | null;
    city?: string | null;
    isPublic: boolean;
  };
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  viewer: {
    isMe: boolean;
    isFollowing: boolean;
    canFollow: boolean;
    canEdit: boolean;
    canViewPrivate: boolean;
  };
}

export interface CommunityProfileUpdatePayload {
  handle?: string;
  displayName?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  city?: string;
  isPublic?: boolean;
}

export interface FollowListItem {
  followedAt: string;
  user: CommunityUserSummary;
}

export interface PetSocialProfileItem {
  pet: CommunityPetSummary;
  profile: {
    handle?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    isPublic: boolean;
  };
}

export interface PetSocialProfileDetail extends PetSocialProfileItem {
  pet: CommunityPetSummary & {
    ownerName?: string;
  };
  viewer: {
    isOwner: boolean;
    canEdit: boolean;
  };
}

export interface PetSocialProfileUpdatePayload {
  handle?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  isPublic?: boolean;
}

export interface CommunityCommentCreatePayload {
  body: string;
}

export interface CommunityReportCreatePayload {
  targetType: "POST" | "COMMENT" | "PROFILE";
  targetId: string;
  reason: string;
}

export interface CommunityReport {
  id: string;
  targetType: "POST" | "COMMENT" | "PROFILE";
  reason: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  reporter: {
    id: string;
    fullName: string;
  };
  target: {
    postId?: string | null;
    commentId?: string | null;
    userId?: string | null;
    fullName?: string | null;
    excerpt?: string | null;
  };
  review: {
    notes?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: {
      id: string;
      fullName: string;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}

export type PetEnergyLevel = "LOW" | "MEDIUM" | "HIGH";

export type SocialWalkInvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type SocialEventType = "WALK" | "PLAYDATE" | "TRAINING" | "HIKE" | "OTHER";

export type SocialEventStatus = "OPEN" | "FULL" | "CANCELLED" | "COMPLETED";

export interface WalkProfile {
  id: string;
  displayName: string;
  bio?: string | null;
  city?: string | null;
  district?: string | null;
  location: {
    latitude?: number | null;
    longitude?: number | null;
  };
  preferences: {
    species?: string | null;
    sizes: Array<"XS" | "S" | "M" | "L" | "XL" | "UNKNOWN">;
    energyLevels: PetEnergyLevel[];
    minAgeMonths?: number | null;
    maxAgeMonths?: number | null;
  };
  isDiscoverable: boolean;
  user: CommunityUserSummary & {
    district?: string | null;
    isMe: boolean;
  };
  viewer: {
    isMe: boolean;
    canEdit: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WalkProfileUpdatePayload {
  displayName?: string;
  bio?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  preferredSpecies?: string;
  preferredSizes?: Array<"XS" | "S" | "M" | "L" | "XL" | "UNKNOWN">;
  preferredEnergyLevels?: PetEnergyLevel[];
  preferredMinAgeMonths?: number;
  preferredMaxAgeMonths?: number;
  isDiscoverable?: boolean;
}

export interface WalkDiscoverQuery {
  city?: string;
  district?: string;
  species?: string;
  size?: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";
  energyLevel?: PetEnergyLevel;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  limit?: number;
}

export interface WalkDiscoverCandidate {
  owner: CommunityUserSummary & {
    district?: string | null;
    isMe: boolean;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string;
    size: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";
    ageMonths?: number | null;
    energyLevel: PetEnergyLevel;
    avatarUrl?: string | null;
    updatedAt: string;
  };
  ownerWalkProfile?: {
    bio?: string | null;
    city?: string | null;
    district?: string | null;
    preferences: {
      species?: string | null;
      sizes: Array<"XS" | "S" | "M" | "L" | "XL" | "UNKNOWN">;
      energyLevels: PetEnergyLevel[];
      minAgeMonths?: number | null;
      maxAgeMonths?: number | null;
    };
  } | null;
  match: {
    compatibilityScore: number;
    reasons: string[];
  };
}

export interface WalkInvitationCreatePayload {
  toUserId: string;
  petId?: string;
  message?: string;
  proposedAt?: string;
  city?: string;
  district?: string;
  placeLabel?: string;
}

export interface WalkInvitation {
  id: string;
  status: SocialWalkInvitationStatus;
  message?: string | null;
  proposedAt?: string | null;
  location: {
    city?: string | null;
    district?: string | null;
    placeLabel?: string | null;
  };
  fromUser: CommunityUserSummary & { district?: string | null; isMe: boolean };
  toUser: CommunityUserSummary & { district?: string | null; isMe: boolean };
  otherUser: CommunityUserSummary & { district?: string | null; isMe: boolean };
  pet?: {
    id: string;
    name: string;
    species: string;
    breed: string;
    size: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";
    ageMonths?: number | null;
    energyLevel: PetEnergyLevel;
    avatarUrl?: string | null;
  } | null;
  metrics: {
    chatMessages: number;
  };
  lastMessage?: {
    id: string;
    body: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
    };
  } | null;
  permissions: {
    canRespond: boolean;
    canCancel: boolean;
    canChat: boolean;
  };
  createdAt: string;
  updatedAt: string;
  respondedAt?: string | null;
}

export interface WalkChatMessage {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    handle?: string | null;
    avatarUrl?: string | null;
    isMe: boolean;
  };
}

export interface WalkChatMessageCreatePayload {
  body: string;
}

export interface GroupEvent {
  id: string;
  title: string;
  description?: string | null;
  type: SocialEventType;
  status: SocialEventStatus;
  location: {
    city: string;
    district?: string | null;
    placeLabel?: string | null;
  };
  startsAt: string;
  endsAt?: string | null;
  maxAttendees?: number | null;
  filters: {
    species?: string | null;
    size?: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN" | null;
    energyLevel?: PetEnergyLevel | null;
    minAgeMonths?: number | null;
    maxAgeMonths?: number | null;
  };
  creator: CommunityUserSummary & { district?: string | null; isMe: boolean };
  attendees: Array<{
    id: string;
    joinedAt: string;
    note?: string | null;
    user: {
      id: string;
      fullName: string;
      handle?: string | null;
      avatarUrl?: string | null;
    };
    pet?: {
      id: string;
      name: string;
      species: string;
      breed: string;
      size: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";
      ageMonths?: number | null;
      energyLevel: PetEnergyLevel;
      avatarUrl?: string | null;
    } | null;
  }>;
  metrics: {
    attendeeCount: number;
  };
  viewer: {
    joinedByMe: boolean;
    canJoin: boolean;
    canLeave: boolean;
    canEdit: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GroupEventQuery {
  city?: string;
  district?: string;
  species?: string;
  size?: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";
  energyLevel?: PetEnergyLevel;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  includePast?: boolean;
  onlyMine?: boolean;
  limit?: number;
}

export interface GroupEventCreatePayload {
  title: string;
  description?: string;
  type?: SocialEventType;
  city: string;
  district?: string;
  placeLabel?: string;
  startsAt: string;
  endsAt?: string;
  maxAttendees?: number;
  speciesFilter?: string;
  sizeFilter?: "XS" | "S" | "M" | "L" | "XL" | "UNKNOWN";
  energyFilter?: PetEnergyLevel;
  minPetAgeMonths?: number;
  maxPetAgeMonths?: number;
}

export interface GroupEventJoinPayload {
  petId?: string;
  note?: string;
}
