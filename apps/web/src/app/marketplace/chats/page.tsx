"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/features/auth/auth-context";
import {
  createMarketplaceMessage,
  listMarketplaceConversationMessages,
  listMarketplaceConversations
} from "@/features/marketplace/marketplace-api";
import type {
  MarketplaceConversation,
  MarketplaceConversationMessages
} from "@/features/marketplace/types";
import { CommercialNav } from "@/components/commercial/commercial-nav";

function fmtClp(cents: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(cents / 100);
}
function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function msgDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function ChatsPage() {
  const { session } = useAuth();
  const token = session?.tokens.accessToken ?? "";
  const myId = session?.user.id;

  const [convs, setConvs] = useState<MarketplaceConversation[]>([]);
  const [selected, setSelected] = useState<MarketplaceConversationMessages | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingConvs(true);
    listMarketplaceConversations(token, { limit: 50 })
      .then(setConvs)
      .finally(() => setLoadingConvs(false));
  }, [token]);

  async function selectConv(conv: MarketplaceConversation) {
    if (!token) return;
    setLoadingMsgs(true);
    try {
      const detail = await listMarketplaceConversationMessages(token, conv.id, 100);
      setSelected(detail);
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selected?.messages.length]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!token || !selected || !message.trim()) return;
    setSending(true);
    try {
      await createMarketplaceMessage(token, selected.conversation.id, message.trim());
      setMessage("");
      const updated = await listMarketplaceConversationMessages(token, selected.conversation.id, 100);
      setSelected(updated);
      await listMarketplaceConversations(token, { limit: 50 }).then(setConvs);
    } finally {
      setSending(false);
    }
  }

  const otherParty = selected
    ? (selected.conversation.viewer.isBuyer
        ? selected.conversation.participants.seller
        : selected.conversation.participants.buyer)
    : null;

  return (
    <AuthGate>
      <div className="space-y-4">
        <CommercialNav />

        <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[600px] rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          {/* ── Conversation list ── */}
          <aside className="border-r border-slate-100 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Mensajes</h2>
            </div>

            {loadingConvs ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : convs.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-sm font-semibold text-slate-700">Sin conversaciones</p>
                <p className="text-xs text-slate-400 mt-1">Inicia una desde un producto del Marketplace</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {convs.map((conv) => {
                  const other = conv.viewer.isBuyer ? conv.participants.seller : conv.participants.buyer;
                  const isActive = selected?.conversation.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => void selectConv(conv)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${isActive ? "bg-[hsl(164_30%_95%)]" : "hover:bg-slate-50"}`}
                    >
                      {/* Avatar */}
                      <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                        {other.fullName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{other.fullName}</p>
                          {conv.lastMessage && (
                            <span className="shrink-0 text-[10px] text-slate-400">{msgDate(conv.lastMessage.createdAt)}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{conv.listing.title}</p>
                        {conv.lastMessage && (
                          <p className="text-xs text-slate-400 truncate">{conv.lastMessage.body}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ── Conversation detail ── */}
          <main className="flex flex-col">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
                <p className="text-3xl mb-3">💬</p>
                <p className="text-sm font-semibold">Selecciona una conversación</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 shrink-0">
                    {otherParty?.fullName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{otherParty?.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {selected.conversation.listing.title} · {fmtClp(selected.conversation.listing.priceCents)}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                {loadingMsgs ? (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-slate-400">Cargando mensajes...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {selected.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.isMine ? "bg-[hsl(var(--primary))] text-white" : "bg-slate-100 text-slate-800"}`}>
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                          <p className={`mt-1 text-[10px] ${msg.isMine ? "text-white/70" : "text-slate-400"}`}>{msgTime(msg.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}

                {/* Send form */}
                {selected.conversation.viewer.canSend && (
                  <form onSubmit={(e) => void sendMessage(e)} className="flex items-end gap-2 border-t border-slate-100 p-3">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(e as unknown as FormEvent); } }}
                      rows={2}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                    />
                    <button type="submit" disabled={sending || !message.trim()} className="btn btn-primary shrink-0 self-end">
                      {sending ? "..." : "Enviar"}
                    </button>
                  </form>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
