"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  createGroupEvent,
  createWalkChatMessage,
  createWalkInvitation,
  discoverWalkCandidates,
  getMyWalkProfile,
  joinGroupEvent,
  leaveGroupEvent,
  listGroupEvents,
  listMyPetSocialProfiles,
  listWalkChatMessages,
  listWalkInvitations,
  respondWalkInvitation,
  updateMyWalkProfile
} from "@/features/community/community-api";
import type {
  GroupEvent,
  PetEnergyLevel,
  PetSocialProfileItem,
  SocialEventType,
  WalkChatMessage,
  WalkDiscoverCandidate,
  WalkInvitation,
  WalkProfile
} from "@/features/community/types";

const SIZE_OPTIONS = ["", "XS", "S", "M", "L", "XL", "UNKNOWN"] as const;
const ENERGY_OPTIONS: Array<"" | PetEnergyLevel> = ["", "LOW", "MEDIUM", "HIGH"];
const EVENT_TYPES: SocialEventType[] = ["WALK", "PLAYDATE", "TRAINING", "HIKE", "OTHER"];

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function inputDateTimeInOneHour() {
  const value = new Date(Date.now() + 3_600_000);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

export default function CommunityMeetPage() {
  const { session } = useAuth();
  const accessToken = session?.tokens.accessToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [profile, setProfile] = useState<WalkProfile | null>(null);
  const [candidates, setCandidates] = useState<WalkDiscoverCandidate[]>([]);
  const [invitations, setInvitations] = useState<WalkInvitation[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [pets, setPets] = useState<PetSocialProfileItem[]>([]);
  const [chatMessages, setChatMessages] = useState<WalkChatMessage[]>([]);

  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileDistrict, setProfileDistrict] = useState("");
  const [profileDiscoverable, setProfileDiscoverable] = useState(true);

  const [discoverCity, setDiscoverCity] = useState("");
  const [discoverDistrict, setDiscoverDistrict] = useState("");
  const [discoverSpecies, setDiscoverSpecies] = useState("");
  const [discoverSize, setDiscoverSize] = useState<(typeof SIZE_OPTIONS)[number]>("");
  const [discoverEnergy, setDiscoverEnergy] = useState<"" | PetEnergyLevel>("");
  const [discoverMinAge, setDiscoverMinAge] = useState("");
  const [discoverMaxAge, setDiscoverMaxAge] = useState("");

  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedInvitationId, setSelectedInvitationId] = useState("");
  const [chatDraft, setChatDraft] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventDistrict, setEventDistrict] = useState("");
  const [eventType, setEventType] = useState<SocialEventType>("WALK");
  const [eventStartsAt, setEventStartsAt] = useState(inputDateTimeInOneHour());
  const [eventPetId, setEventPetId] = useState("");

  const selectedInvitation = useMemo(
    () => invitations.find((item) => item.id === selectedInvitationId) ?? null,
    [invitations, selectedInvitationId]
  );

  const syncProfile = (next: WalkProfile) => {
    setProfile(next);
    setProfileDisplayName(next.displayName ?? "");
    setProfileBio(next.bio ?? "");
    setProfileCity(next.city ?? "");
    setProfileDistrict(next.district ?? "");
    setProfileDiscoverable(next.isDiscoverable);
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [walkProfile, discover, invitationList, eventList, petList] = await Promise.all([
        getMyWalkProfile(accessToken),
        discoverWalkCandidates(accessToken, { limit: 30 }),
        listWalkInvitations(accessToken, { role: "all", limit: 80 }),
        listGroupEvents(accessToken, { limit: 40, includePast: false }),
        listMyPetSocialProfiles(accessToken)
      ]);
      syncProfile(walkProfile);
      setCandidates(discover);
      setInvitations(invitationList);
      setEvents(eventList);
      setPets(petList);
      setEventCity(walkProfile.city ?? "");
      setEventDistrict(walkProfile.district ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar encuentros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const reloadInvitations = async () => {
    if (!accessToken) return;
    const data = await listWalkInvitations(accessToken, { role: "all", limit: 80 });
    setInvitations(data);
    if (selectedInvitationId && !data.some((item) => item.id === selectedInvitationId)) {
      setSelectedInvitationId("");
      setChatMessages([]);
    }
  };

  const reloadEvents = async () => {
    if (!accessToken) return;
    const data = await listGroupEvents(accessToken, { limit: 40, includePast: false });
    setEvents(data);
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setWorkingId("profile");
    setError(null);
    try {
      const updated = await updateMyWalkProfile(accessToken, {
        displayName: profileDisplayName || undefined,
        bio: profileBio || undefined,
        city: profileCity || undefined,
        district: profileDistrict || undefined,
        isDiscoverable: profileDiscoverable
      });
      syncProfile(updated);
      setSuccess("Perfil de paseos actualizado.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "No se pudo guardar perfil.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDiscover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      const data = await discoverWalkCandidates(accessToken, {
        city: discoverCity || undefined,
        district: discoverDistrict || undefined,
        species: discoverSpecies || undefined,
        size: discoverSize || undefined,
        energyLevel: discoverEnergy || undefined,
        minAgeMonths: discoverMinAge ? Number(discoverMinAge) : undefined,
        maxAgeMonths: discoverMaxAge ? Number(discoverMaxAge) : undefined,
        limit: 40
      });
      setCandidates(data);
    } catch (discoverError) {
      setError(discoverError instanceof Error ? discoverError.message : "No se pudo buscar.");
    }
  };

  const handleInvite = async (candidate: WalkDiscoverCandidate) => {
    if (!accessToken) return;
    const message = window.prompt(
      `Mensaje para ${candidate.owner.fullName} (opcional):`,
      "Hola! Te gustaria coordinar un paseo pet?"
    );
    if (message === null) return;

    setWorkingId(candidate.owner.id);
    setError(null);
    try {
      await createWalkInvitation(accessToken, {
        toUserId: candidate.owner.id,
        petId: selectedPetId || undefined,
        message: message || undefined,
        city: discoverCity || profileCity || undefined,
        district: discoverDistrict || profileDistrict || undefined
      });
      await reloadInvitations();
      setSuccess("Invitacion enviada.");
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "No se pudo enviar invitacion.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleRespondInvitation = async (
    invitationId: string,
    status: "ACCEPTED" | "REJECTED" | "CANCELLED"
  ) => {
    if (!accessToken) return;
    setWorkingId(invitationId);
    setError(null);
    try {
      await respondWalkInvitation(accessToken, invitationId, status);
      await reloadInvitations();
      if (selectedInvitationId === invitationId) {
        const data = await listWalkChatMessages(accessToken, invitationId);
        setChatMessages(data);
      }
      setSuccess("Invitacion actualizada.");
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : "No se pudo responder invitacion.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleOpenChat = async (invitationId: string) => {
    if (!accessToken) return;
    setWorkingId(invitationId);
    setSelectedInvitationId(invitationId);
    setError(null);
    try {
      const data = await listWalkChatMessages(accessToken, invitationId);
      setChatMessages(data);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "No se pudo cargar chat.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleSendChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !selectedInvitationId || !chatDraft.trim()) return;
    setWorkingId("chat-send");
    setError(null);
    try {
      await createWalkChatMessage(accessToken, selectedInvitationId, { body: chatDraft });
      const data = await listWalkChatMessages(accessToken, selectedInvitationId);
      setChatMessages(data);
      setChatDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No se pudo enviar mensaje.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setWorkingId("event-create");
    setError(null);
    try {
      await createGroupEvent(accessToken, {
        title: eventTitle,
        type: eventType,
        city: eventCity,
        district: eventDistrict || undefined,
        startsAt: new Date(eventStartsAt).toISOString()
      });
      await reloadEvents();
      setEventTitle("");
      setEventType("WALK");
      setEventStartsAt(inputDateTimeInOneHour());
      setSuccess("Evento grupal creado.");
    } catch (eventError) {
      setError(eventError instanceof Error ? eventError.message : "No se pudo crear evento.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleJoinEvent = async (item: GroupEvent) => {
    if (!accessToken) return;
    setWorkingId(item.id);
    setError(null);
    try {
      await joinGroupEvent(accessToken, item.id, { petId: eventPetId || undefined });
      await reloadEvents();
      setSuccess("Te uniste al evento.");
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "No se pudo unir.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleLeaveEvent = async (item: GroupEvent) => {
    if (!accessToken) return;
    setWorkingId(item.id);
    setError(null);
    try {
      await leaveGroupEvent(accessToken, item.id);
      await reloadEvents();
      setSuccess("Saliste del evento.");
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "No se pudo salir.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AuthGate>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Encuentros y paseos pet</h1>
              <p className="text-sm text-slate-600">Discover + invitaciones + chat + eventos grupales.</p>
            </div>
            <Link href="/community" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              Volver
            </Link>
          </div>
        </header>

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Cargando encuentros...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-bold text-slate-900">Mi perfil de paseos</h2>
                <p className="text-xs text-slate-500">ID: {profile?.id ?? "-"}</p>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleSaveProfile(event)}>
                  <input value={profileDisplayName} onChange={(event) => setProfileDisplayName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre visible" />
                  <textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Bio" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={profileCity} onChange={(event) => setProfileCity(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ciudad" />
                    <input value={profileDistrict} onChange={(event) => setProfileDistrict(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Zona" />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={profileDiscoverable} onChange={(event) => setProfileDiscoverable(event.target.checked)} />Perfil discoverable</label>
                  <button type="submit" disabled={workingId === "profile"} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60">{workingId === "profile" ? "Guardando..." : "Guardar perfil"}</button>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-bold text-slate-900">Chat previo</h2>
                <select value={selectedInvitationId} onChange={(event) => { const next = event.target.value; setSelectedInvitationId(next); if (next) { void handleOpenChat(next); } }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Selecciona invitacion</option>
                  {invitations.filter((item) => item.permissions.canChat).map((item) => <option key={item.id} value={item.id}>{item.otherUser.fullName} - {item.status}</option>)}
                </select>
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-2">
                  {chatMessages.map((message) => <div key={message.id} className={`rounded-lg px-2 py-1 text-xs ${message.sender.isMe ? "bg-slate-900 text-white ml-8" : "bg-white border border-slate-200 text-slate-700 mr-8"}`}><p className="font-semibold">{message.sender.fullName}</p><p>{message.body}</p></div>)}
                  {chatMessages.length === 0 && <p className="text-xs text-slate-500">Sin mensajes.</p>}
                </div>
                <form className="mt-2 flex gap-2" onSubmit={(event) => void handleSendChat(event)}>
                  <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" placeholder="Escribe un mensaje" />
                  <button type="submit" disabled={workingId === "chat-send"} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Enviar</button>
                </form>
              </section>
            </aside>

            <section className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Descubrir perfiles</h2>
                  <select value={selectedPetId} onChange={(event) => setSelectedPetId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">
                    <option value="">Invitar sin mascota</option>
                    {pets.map((item) => <option key={item.pet.id} value={item.pet.id}>Invitar como {item.pet.name}</option>)}
                  </select>
                </div>
                <form className="mt-2 grid gap-2 md:grid-cols-7" onSubmit={(event) => void handleDiscover(event)}>
                  <input value={discoverCity} onChange={(event) => setDiscoverCity(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ciudad" />
                  <input value={discoverDistrict} onChange={(event) => setDiscoverDistrict(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Zona" />
                  <input value={discoverSpecies} onChange={(event) => setDiscoverSpecies(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Especie" />
                  <select value={discoverSize} onChange={(event) => setDiscoverSize(event.target.value as (typeof SIZE_OPTIONS)[number])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{SIZE_OPTIONS.map((item) => <option key={item || "all-size"} value={item}>{item || "Tamano"}</option>)}</select>
                  <select value={discoverEnergy} onChange={(event) => setDiscoverEnergy(event.target.value as "" | PetEnergyLevel)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{ENERGY_OPTIONS.map((item) => <option key={item || "all-energy"} value={item}>{item || "Energia"}</option>)}</select>
                  <input inputMode="numeric" value={discoverMinAge} onChange={(event) => setDiscoverMinAge(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Edad min (meses)" />
                  <input inputMode="numeric" value={discoverMaxAge} onChange={(event) => setDiscoverMaxAge(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Edad max (meses)" />
                  <button type="submit" className="md:col-span-7 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Buscar</button>
                </form>
              </section>

              <div className="space-y-3">
                {candidates.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Sin candidatos para este filtro.</div>
                ) : (
                  candidates.map((candidate) => (
                    <article key={`${candidate.owner.id}-${candidate.pet.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{candidate.owner.fullName}</p>
                          <p className="text-xs text-slate-600">{candidate.owner.city || "-"} {candidate.owner.district ? `| ${candidate.owner.district}` : ""}</p>
                          <p className="mt-1 text-sm text-slate-800">{candidate.pet.name} ({candidate.pet.species}, {candidate.pet.size}, {candidate.pet.energyLevel})</p>
                          <p className="text-xs text-slate-600">Match {candidate.match.compatibilityScore} | {candidate.match.reasons.join(", ") || "sin senales fuertes"}</p>
                        </div>
                        <button type="button" disabled={workingId === candidate.owner.id} onClick={() => { void handleInvite(candidate); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">{workingId === candidate.owner.id ? "Enviando..." : "Invitar"}</button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-bold text-slate-900">Invitaciones</h2>
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {invitations.length === 0 ? (
                    <p className="text-xs text-slate-600">Sin invitaciones.</p>
                  ) : (
                    invitations.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.otherUser.fullName}</p>
                        <p className="text-xs text-slate-600">{item.status} | {formatDateTime(item.createdAt)}</p>
                        {item.message && <p className="mt-1 text-xs text-slate-700">{item.message}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.permissions.canRespond && <button type="button" disabled={workingId === item.id} onClick={() => { void handleRespondInvitation(item.id, "ACCEPTED"); }} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">Aceptar</button>}
                          {item.permissions.canRespond && <button type="button" disabled={workingId === item.id} onClick={() => { void handleRespondInvitation(item.id, "REJECTED"); }} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">Rechazar</button>}
                          {item.permissions.canCancel && <button type="button" disabled={workingId === item.id} onClick={() => { void handleRespondInvitation(item.id, "CANCELLED"); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Cancelar</button>}
                          {item.permissions.canChat && <button type="button" disabled={workingId === item.id} onClick={() => { void handleOpenChat(item.id); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Chat</button>}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-bold text-slate-900">Eventos grupales</h2>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void handleCreateEvent(event)}>
                  <input required value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Titulo" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={eventType} onChange={(event) => setEventType(event.target.value as SocialEventType)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{EVENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    <input required type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input required value={eventCity} onChange={(event) => setEventCity(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ciudad" />
                    <input value={eventDistrict} onChange={(event) => setEventDistrict(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Zona" />
                  </div>
                  <button type="submit" disabled={workingId === "event-create"} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{workingId === "event-create" ? "Creando..." : "Crear evento"}</button>
                </form>
                <select value={eventPetId} onChange={(event) => setEventPetId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">
                  <option value="">Unirme sin mascota</option>
                  {pets.map((item) => <option key={item.pet.id} value={item.pet.id}>Unirme como {item.pet.name}</option>)}
                </select>
                <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {events.length === 0 ? (
                    <p className="text-xs text-slate-600">Sin eventos activos.</p>
                  ) : (
                    events.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.type} | {item.location.city} {item.location.district ? `- ${item.location.district}` : ""}</p>
                        <p className="text-xs text-slate-600">{formatDateTime(item.startsAt)} | cupos {item.metrics.attendeeCount}{item.maxAttendees ? `/${item.maxAttendees}` : ""}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.viewer.canJoin && <button type="button" disabled={workingId === item.id} onClick={() => { void handleJoinEvent(item); }} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700">Unirme</button>}
                          {item.viewer.canLeave && <button type="button" disabled={workingId === item.id} onClick={() => { void handleLeaveEvent(item); }} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">Salir</button>}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
