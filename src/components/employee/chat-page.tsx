"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { ChatChannel, ChatMessage, User } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  MessageSquare,
  Hash,
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface TeamUser {
  id: string;
  fullName: string;
  email: string;
  isOnline?: boolean;
  avatarUrl?: string;
}

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

  // Tabs
  const [activeTab, setActiveTab] = useState("channels");

  // Team users for direct messaging
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Create group chat
  const [createOpen, setCreateOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("group");
  const [creating, setCreating] = useState(false);
  const [createUsers, setCreateUsers] = useState<TeamUser[]>([]);
  const [createUsersLoading, setCreateUsersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [directUserId, setDirectUserId] = useState("");
  const [createUserSearch, setCreateUserSearch] = useState("");

  // Fetch channels
  useEffect(() => {
    let cancelled = false;
    async function fetchChannels() {
      try {
        const data = await api.get<ChatChannel[]>("/api/chat/channels");
        if (!cancelled) {
          const chs = Array.isArray(data) ? data : [];
          setChannels(chs);
          if (chs.length > 0 && !selectedChannel) {
            setSelectedChannel(chs[0]);
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoadingChannels(false);
      }
    }
    fetchChannels();
    return () => { cancelled = true; };
  }, []);

  // Fetch team users
  const fetchTeamUsers = useCallback(async () => {
    try {
      setTeamLoading(true);
      const data = await api.get<User[]>("/api/users?limit=200&isActive=true");
      const users: TeamUser[] = (Array.isArray(data) ? data : [])
        .filter((u) => u.id !== user?.id)
        .map((u) => ({
          id: u.id,
          fullName: u.fullName || "Unknown",
          email: u.email || "",
          isOnline: false,
          avatarUrl: u.avatarUrl,
        }));
      setTeamUsers(users);
    } catch {
      // silent
    } finally {
      setTeamLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeamUsers();
  }, [fetchTeamUsers]);

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
      toast.error("Failed to send message");
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

  // Handle selecting a user for direct message
  async function handleSelectUser(teamUser: TeamUser) {
    try {
      const allChannels = await api.get<ChatChannel[]>("/api/chat/channels");
      const channelList = Array.isArray(allChannels) ? allChannels : [];
      const existing = channelList.find(
        (ch) => ch.type === "direct" && ch.name.includes(teamUser.id)
      );
      if (existing) {
        setSelectedChannel(existing);
        setActiveTab("channels");
        return;
      }
      const dmChannel = await api.post<ChatChannel>("/api/chat/channels", {
        name: `dm-${user?.id || "unknown"}-${teamUser.id}`,
        type: "direct",
        memberIds: [teamUser.id],
      });
      setSelectedChannel(dmChannel);
      setChannels((prev) => [...prev, dmChannel]);
      setActiveTab("channels");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open conversation");
    }
  }

  // Open create dialog
  function openCreateDialog() {
    setCreateOpen(true);
    setChannelName("");
    setChannelType("group");
    setSelectedMemberIds([]);
    setDirectUserId("");
    setCreateUserSearch("");
    fetchCreateUsers();
  }

  // Fetch users for create dialog
  const fetchCreateUsers = useCallback(async () => {
    try {
      setCreateUsersLoading(true);
      const data = await api.get<User[]>("/api/users?limit=200&isActive=true");
      const users: TeamUser[] = (Array.isArray(data) ? data : [])
        .filter((u) => u.id !== user?.id)
        .map((u) => ({
          id: u.id,
          fullName: u.fullName || "Unknown",
          email: u.email || "",
          avatarUrl: u.avatarUrl,
        }));
      setCreateUsers(users);
    } catch {
      // silent
    } finally {
      setCreateUsersLoading(false);
    }
  }, [user?.id]);

  // Toggle member selection
  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Create channel
  async function handleCreateChannel() {
    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }
    if (channelType === "direct" && !directUserId) {
      toast.error("Please select a user");
      return;
    }
    try {
      setCreating(true);
      const body: Record<string, unknown> = {
        name: channelName.trim(),
        type: channelType,
      };
      if (channelType === "group" && selectedMemberIds.length > 0) {
        body.memberIds = selectedMemberIds;
      }
      if (channelType === "direct" && directUserId) {
        body.memberIds = [directUserId];
      }
      const newChannel = await api.post<ChatChannel>("/api/chat/channels", body);
      toast.success("Channel created");
      setCreateOpen(false);
      setChannelName("");
      setChannelType("group");
      setSelectedMemberIds([]);
      setDirectUserId("");
      setCreateUserSearch("");
      setChannels((prev) => [...prev, newChannel]);
      setSelectedChannel(newChannel);
      setActiveTab("channels");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreating(false);
    }
  }

  // Filter create users by search
  const filteredCreateUsers = useMemo(() => {
    if (!createUserSearch.trim()) return createUsers;
    const q = createUserSearch.toLowerCase();
    return createUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [createUsers, createUserSearch]);

  // Find DM user name for header
  const selectedDmUser = selectedChannel?.type === "direct"
    ? teamUsers.find((u) => selectedChannel.name.includes(u.id))
    : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-lg border bg-card overflow-hidden">
      {/* Channel Sidebar */}
      <div className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <div className="px-2 pt-2">
            <TabsList className="w-full grid grid-cols-2 h-8">
              <TabsTrigger value="channels" className="text-xs h-7">
                Channels
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs h-7">
                Team
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Channels Tab */}
          <TabsContent value="channels" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
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
                {channels
                  .filter((ch) => ch.type !== "direct")
                  .map((channel) => {
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

                {/* DM channels */}
                {channels.filter((ch) => ch.type === "direct").length > 0 && (
                  <>
                    <div className="px-1 pt-3 pb-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Direct Messages
                      </p>
                    </div>
                    {channels
                      .filter((ch) => ch.type === "direct")
                      .map((ch) => {
                        const dmUser = teamUsers.find((u) => ch.name.includes(u.id));
                        const isActive = selectedChannel?.id === ch.id;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => setSelectedChannel(ch)}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left w-full transition-colors cursor-pointer ${
                              isActive
                                ? "bg-[#E0197A]/15 text-[#E0197A] font-medium"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarFallback className="text-[8px] bg-[#E0197A]/10 text-[#E0197A]">
                                {dmUser ? getInitials(dmUser.fullName) : "DM"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate flex-1">{dmUser?.fullName || "Direct Message"}</span>
                          </button>
                        );
                      })}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 flex flex-col gap-1">
                {teamLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : teamUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No team members found
                  </p>
                ) : (
                  teamUsers.map((teamUser) => (
                    <button
                      key={teamUser.id}
                      onClick={() => handleSelectUser(teamUser)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left w-full transition-colors cursor-pointer hover:bg-muted"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-[#E0197A]/10 text-[#E0197A]">
                            {getInitials(teamUser.fullName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{teamUser.fullName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{teamUser.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
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
              {selectedChannel.type === "direct" && selectedDmUser ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-[#E0197A]/10 text-[#E0197A]">
                      {getInitials(selectedDmUser.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">{selectedDmUser.fullName}</span>
                  <span className="text-xs text-muted-foreground">{selectedDmUser.email}</span>
                </>
              ) : (
                <>
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-sm">{selectedChannel.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedChannel.type}
                  </Badge>
                </>
              )}
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

      {/* Create Channel Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setChannelName("");
            setChannelType("group");
            setSelectedMemberIds([]);
            setDirectUserId("");
            setCreateUserSearch("");
          }
          setCreateOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="channel-name">Name</Label>
              <Input
                id="channel-name"
                placeholder="e.g. marketing-team, design-feedback"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>

            {/* Channel Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={channelType} onValueChange={(v) => {
                setChannelType(v);
                setSelectedMemberIds([]);
                setDirectUserId("");
                setCreateUserSearch("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="direct">Direct Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group: User checkbox list */}
            {channelType === "group" && (
              <div className="space-y-2">
                <Label>
                  Select Members{" "}
                  {selectedMemberIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {selectedMemberIds.length} selected
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9"
                    value={createUserSearch}
                    onChange={(e) => setCreateUserSearch(e.target.value)}
                  />
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {createUsersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredCreateUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No users found
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredCreateUsers.map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedMemberIds.includes(u.id)}
                            onCheckedChange={() => toggleMember(u.id)}
                          />
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[9px] bg-[#E0197A]/10 text-[#E0197A]">
                              {getInitials(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.fullName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Direct: Single user selection */}
            {channelType === "direct" && (
              <div className="space-y-2">
                <Label>Select User</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9"
                    value={createUserSearch}
                    onChange={(e) => setCreateUserSearch(e.target.value)}
                  />
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {createUsersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredCreateUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No users found
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredCreateUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setDirectUserId(u.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                            directUserId === u.id
                              ? "bg-accent"
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[9px] bg-[#E0197A]/10 text-[#E0197A]">
                              {getInitials(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.fullName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                          {directUserId === u.id && (
                            <Badge variant="default" className="text-[10px] shrink-0">Selected</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={
                creating ||
                !channelName.trim() ||
                (channelType === "direct" && !directUserId)
              }
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}