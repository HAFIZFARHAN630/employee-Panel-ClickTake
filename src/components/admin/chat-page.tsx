"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { ChatChannel, ChatMessage } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus, Send, Hash } from "lucide-react";
import { format } from "date-fns";

export function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("team");
  const [sending, setSending] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<ChatChannel[]>("/api/chat/channels");
      setChannels(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch {
      toast.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [selectedChannel]);

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      setMessagesLoading(true);
      const data = await api.get<ChatMessage[]>(
        `/api/chat/channels/${channelId}/messages`
      );
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
    }
  }, [selectedChannel, fetchMessages]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!selectedChannel) return;
    const interval = setInterval(() => {
      fetchMessages(selectedChannel.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChannel, fetchMessages]);

  async function handleSend() {
    if (!newMessage.trim() || !selectedChannel) return;
    try {
      setSending(true);
      await api.post(
        `/api/chat/channels/${selectedChannel.id}/messages`,
        {
          content: newMessage.trim(),
        }
      );
      setNewMessage("");
      fetchMessages(selectedChannel.id);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleCreateChannel() {
    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }
    try {
      await api.post("/api/chat/channels", {
        name: channelName.trim(),
        type: channelType,
      });
      toast.success("Channel created");
      setCreateOpen(false);
      setChannelName("");
      setChannelType("team");
      fetchChannels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create channel");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Chat</h2>
            <p className="text-sm text-muted-foreground">
              Team communication channels
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Channel
        </Button>
      </div>

      <Card className="overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
        <CardContent className="flex h-full p-0">
          {/* Channel List */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-3 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Channels
              </p>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-2 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : channels.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No channels yet
                </div>
              ) : (
                <div className="p-1">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                        selectedChannel?.id === ch.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <Hash className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{ch.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                        {ch.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChannel ? (
              <>
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{selectedChannel.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedChannel.type}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-3/4" />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                isMe
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {!isMe && (
                                <p className="text-xs font-semibold mb-0.5 opacity-80">
                                  {msg.senderName || "Unknown"}
                                </p>
                              )}
                              <p className="text-sm">{msg.content}</p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  isMe ? "opacity-70" : "text-muted-foreground"
                                }`}
                              >
                                {format(new Date(msg.createdAt), "HH:mm")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Select a channel to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Channel Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                placeholder="e.g. general, project-alpha"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={channelType} onValueChange={setChannelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChannel}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}