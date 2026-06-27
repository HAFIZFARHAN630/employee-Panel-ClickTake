"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { ChatChannel, ChatMessage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, Hash, Loader2 } from "lucide-react";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}



export function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch channels
  useEffect(() => {
    let cancelled = false;
    async function fetchChannels() {
      try {
        const data = await api.get<ChatChannel[]>("/api/chat/channels");
        if (!cancelled) setChannels(Array.isArray(data) ? data : []);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoadingChannels(false);
      }
    }
    fetchChannels();
    return () => { cancelled = true; };
  }, []);

  // Fetch messages for selected channel
  const fetchMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const data = await api.get<ChatMessage[]>(`/api/chat/channels/${channelId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // When channel changes, fetch messages
  useEffect(() => {
    if (!selectedChannel) return;
    fetchMessages(selectedChannel.id);
  }, [selectedChannel, fetchMessages]);

  // Auto-poll every 5 seconds
  useEffect(() => {
    if (!selectedChannel) return;
    const interval = setInterval(() => {
      fetchMessages(selectedChannel.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChannel, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedChannel || !newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      await api.post<ChatMessage>(`/api/chat/channels/${selectedChannel.id}/messages`, { content });
      await fetchMessages(selectedChannel.id);
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentUserId = user?.id;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-lg border bg-card overflow-hidden">
      {/* Channel Sidebar */}
      <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Channels
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {loadingChannels && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingChannels && channels.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No channels available
              </p>
            )}
            {channels.map((channel) => {
              const isActive = selectedChannel?.id === channel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left w-full transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#E0197A]/15 text-[#E0197A] font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{channel.name}</span>
                  <Badge
                    variant={channel.type === "team" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                  >
                    {channel.type}
                  </Badge>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedChannel ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Select a channel to start chatting
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Channel Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-sm">{selectedChannel.name}</span>
              <Badge variant="outline" className="text-[10px]">
                {selectedChannel.type}
              </Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="p-4 flex flex-col gap-4">
                {loadingMessages && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">
                      No messages yet. Be the first to say something!
                    </p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isOwn = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={`text-xs text-white ${
                            isOwn
                              ? "bg-gradient-to-br from-[#E0197A] to-[#7B2FBE]"
                              : "bg-muted-foreground"
                          }`}
                        >
                          {getInitials(msg.senderName || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">
                            {msg.senderName || "Unknown User"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`inline-block rounded-lg px-3 py-2 text-sm ${
                            isOwn
                              ? "bg-[#E0197A] text-white rounded-tr-none"
                              : "bg-muted rounded-tl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  size="icon"
                  className="bg-[#E0197A] hover:bg-[#E0197A]/90 text-white shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}