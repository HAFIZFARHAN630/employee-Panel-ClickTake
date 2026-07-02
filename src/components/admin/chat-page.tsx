"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { ChatChannel, ChatChannelMember, ChatMessage, User, Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Plus,
  Send,
  Hash,
  Users,
  Search,
  Loader2,
  FolderOpen,
  AtSign,
} from "lucide-react";
import { format } from "date-fns";

interface TeamUser {
  id: string;
  fullName: string;
  email: string;
  isOnline?: boolean;
  avatarUrl?: string;
}

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
  const [creating, setCreating] = useState(false);

  // Team tab state
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("channels");

  // Create channel - project & user selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectMembersNote, setProjectMembersNote] = useState("");
  const [createUsers, setCreateUsers] = useState<TeamUser[]>([]);
  const [createUsersLoading, setCreateUsersLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [directUserId, setDirectUserId] = useState("");
  const [createUserSearch, setCreateUserSearch] = useState("");

  // @mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [channelMembers, setChannelMembers] = useState<ChatChannelMember[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

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

  const fetchChannelMembers = useCallback(async (channelId: string) => {
    try {
      const data = await api.get<ChatChannelMember[]>(
        `/api/chat/channels/${channelId}/members`
      );
      setChannelMembers(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, []);

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
          isOnline: (u as unknown as Record<string, unknown>).isOnline as boolean ?? false,
          avatarUrl: u.avatarUrl,
        }));
      setTeamUsers(users);
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setTeamLoading(false);
    }
  }, [user?.id]);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>("/api/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, []);

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

  useEffect(() => {
    fetchChannels();
    fetchTeamUsers();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      fetchChannelMembers(selectedChannel.id);
    }
  }, [selectedChannel, fetchMessages, fetchChannelMembers]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!selectedChannel) return;
    const interval = setInterval(() => {
      fetchMessages(selectedChannel.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChannel, fetchMessages]);

  // When channel type changes, reset related state
  useEffect(() => {
    setSelectedProjectId("");
    setProjectMembersNote("");
    setSelectedMemberIds([]);
    setDirectUserId("");
    setCreateUserSearch("");
  }, [channelType]);

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
      setCreating(true);
      const body: Record<string, unknown> = {
        name: channelName.trim(),
        type: channelType,
      };

      if (channelType === "project" && selectedProjectId) {
        body.projectId = selectedProjectId;
      }

      if ((channelType === "group" || channelType === "team") && selectedMemberIds.length > 0) {
        body.memberIds = selectedMemberIds;
      }

      if (channelType === "direct" && directUserId) {
        body.memberIds = [directUserId];
      }

      await api.post("/api/chat/channels", body);
      toast.success("Channel created");
      setCreateOpen(false);
      setChannelName("");
      setChannelType("team");
      setSelectedProjectId("");
      setSelectedMemberIds([]);
      setDirectUserId("");
      setCreateUserSearch("");
      fetchChannels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreating(false);
    }
  }

  // When project is selected, note about auto-adding members
  async function handleProjectSelect(projectId: string) {
    setSelectedProjectId(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setProjectMembersNote(
        `All employees assigned to "${project.name}" will be auto-added to this channel.`
      );
    } else {
      setProjectMembersNote("");
    }
  }

  async function handleSelectUser(teamUser: TeamUser) {
    try {
      // Check if a direct channel already exists between current user and selected user
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

      // Create a new direct channel
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

  function handleKeyDown(e: React.KeyboardEvent) {
    // Handle mention dropdown navigation
    if (showMentionDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, filteredMentionMembers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && filteredMentionMembers.length > 0) {
        e.preventDefault();
        insertMention(filteredMentionMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function openCreateDialog() {
    setCreateOpen(true);
    setChannelName("");
    setChannelType("team");
    setSelectedProjectId("");
    setProjectMembersNote("");
    setSelectedMemberIds([]);
    setDirectUserId("");
    setCreateUserSearch("");
    fetchProjects();
    fetchCreateUsers();
  }

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // Find selected user for DM header display
  const selectedDmUser = selectedChannel?.type === "direct"
    ? teamUsers.find((u) => selectedChannel.name.includes(u.id))
    : null;

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

  // ============ @MENTION LOGIC ============

  const filteredMentionMembers = useMemo(() => {
    const currentUserId = user?.id;
    const membersWithSelf = [
      ...(selectedChannel?.members || channelMembers),
    ];
    const uniqueMembers = membersWithSelf.filter(
      (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
    );
    const available = uniqueMembers.filter((m) => m.id !== currentUserId);
    if (!mentionQuery.trim()) return available;
    const q = mentionQuery.toLowerCase();
    return available.filter((m) => m.fullName.toLowerCase().includes(q));
  }, [mentionQuery, selectedChannel?.members, channelMembers, user?.id]);

  function handleInputChange(value: string) {
    setNewMessage(value);

    // Detect @mention trigger
    const cursorPos = value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentionDropdown(true);
      setMentionIndex(0);
    } else {
      setShowMentionDropdown(false);
    }
  }

  function insertMention(member: ChatChannelMember) {
    const cursorPos = newMessage.length;
    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const mentionStart = textBeforeCursor.lastIndexOf("@");
    const before = newMessage.slice(0, mentionStart);
    const after = newMessage.slice(cursorPos);

    setNewMessage(`${before}@${member.fullName} ${after}`);
    setShowMentionDropdown(false);
    setMentionQuery("");
    void mentionIndex;

    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
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
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Channel
        </Button>
      </div>

      <Card className="overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
        <CardContent className="flex h-full p-0">
          {/* Left Panel: Tabs for Channels / Team */}
          <div className="w-64 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="px-1 pt-2">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="channels" className="text-xs">
                    Channels
                  </TabsTrigger>
                  <TabsTrigger value="team" className="text-xs">
                    Team
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Channels Tab */}
              <TabsContent value="channels" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full">
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
                      {channels
                        .filter((ch) => ch.type !== "direct")
                        .map((ch) => (
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
                            <span className="truncate flex-1">{ch.name}</span>
                            {/* Member avatars */}
                            {ch.members && ch.members.length > 0 && (
                              <div className="flex -space-x-1.5 shrink-0">
                                {ch.members.slice(0, 3).map((m) => (
                                  <Avatar key={m.id} className="h-5 w-5 border border-background">
                                    <AvatarImage src={m.avatarUrl || undefined} />
                                    <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                      {getInitials(m.fullName)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {(ch.members.length ?? 0) > 3 && (
                                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[9px] font-medium border border-background">
                                    +{ch.members!.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              {ch.type}
                            </Badge>
                          </button>
                        ))}
                      {/* Also show DM channels at bottom */}
                      {channels.filter((ch) => ch.type === "direct").length > 0 && (
                        <>
                          <div className="px-3 pt-4 pb-1">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Direct Messages
                            </p>
                          </div>
                          {channels
                            .filter((ch) => ch.type === "direct")
                            .map((ch) => {
                              const dmUser = teamUsers.find((u) => ch.name.includes(u.id));
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => setSelectedChannel(ch)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                                    selectedChannel?.id === ch.id
                                      ? "bg-accent text-accent-foreground"
                                      : "hover:bg-accent/50"
                                  }`}
                                >
                                  <div className="relative shrink-0">
                                    <Avatar className="h-5 w-5">
                                      {dmUser?.avatarUrl && <AvatarImage src={dmUser.avatarUrl} />}
                                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                        {dmUser ? getInitials(dmUser.fullName) : "DM"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
                                  </div>
                                  <span className="truncate">{dmUser?.fullName || "Direct Message"}</span>
                                </button>
                              );
                            })}
                        </>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {teamLoading ? (
                    <div className="p-2 space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : teamUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No team members found
                    </div>
                  ) : (
                    <div className="p-1">
                      {teamUsers.map((teamUser) => (
                        <button
                          key={teamUser.id}
                          onClick={() => handleSelectUser(teamUser)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors hover:bg-accent/50`}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-7 w-7">
                              {teamUser.avatarUrl && <AvatarImage src={teamUser.avatarUrl} />}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getInitials(teamUser.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                                teamUser.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{teamUser.fullName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{teamUser.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChannel ? (
              <>
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  {selectedChannel.type === "direct" && selectedDmUser ? (
                    <>
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          {selectedDmUser.avatarUrl && <AvatarImage src={selectedDmUser.avatarUrl} />}
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {getInitials(selectedDmUser.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
                      </div>
                      <span className="font-semibold text-sm">{selectedDmUser.fullName}</span>
                      <span className="text-xs text-muted-foreground">{selectedDmUser.email}</span>
                    </>
                  ) : (
                    <>
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{selectedChannel.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedChannel.type}
                      </Badge>
                      {/* Show member count in header */}
                      {selectedChannel.memberCount !== undefined && selectedChannel.memberCount > 0 && (
                        <div className="flex items-center gap-1 ml-1">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{selectedChannel.memberCount}</span>
                        </div>
                      )}
                      {/* Show member avatars in header */}
                      {selectedChannel.members && selectedChannel.members.length > 0 && (
                        <div className="flex -space-x-1.5 ml-1">
                          {selectedChannel.members.slice(0, 5).map((m) => (
                            <Avatar key={m.id} className="h-5 w-5 border border-background">
                              <AvatarImage src={m.avatarUrl || undefined} />
                              <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                {getInitials(m.fullName)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {selectedChannel.members.length > 5 && (
                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[9px] font-medium border border-background">
                              +{selectedChannel.members.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
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
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

                {/* Message Input with @mention support */}
                <div className="p-3 border-t">
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        placeholder="Type a message... (use @ to mention)"
                        value={newMessage}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 pr-8"
                      />
                      <AtSign className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>

                    {/* Mention Dropdown */}
                    {showMentionDropdown && filteredMentionMembers.length > 0 && (
                      <div
                        ref={mentionListRef}
                        className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-md z-50"
                      >
                        <div className="p-1">
                          {filteredMentionMembers.map((member, idx) => (
                            <button
                              key={member.id}
                              type="button"
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                                idx === mentionIndex
                                  ? "bg-accent"
                                  : "hover:bg-accent/50"
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertMention(member);
                              }}
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                  {getInitials(member.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.fullName}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">{member.role}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
      <Dialog open={createOpen} onOpenChange={(open) => {
        if (!open) {
          setChannelType("team");
          setSelectedProjectId("");
          setProjectMembersNote("");
          setSelectedMemberIds([]);
          setDirectUserId("");
          setCreateUserSearch("");
        }
        setCreateOpen(open);
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                placeholder="e.g. general, project-alpha"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>

            {/* Channel Type */}
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select value={channelType} onValueChange={setChannelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Selection (when type === "project") */}
            {channelType === "project" && (
              <div className="space-y-2">
                <Label>Select Project</Label>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects available</p>
                ) : (
                  <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {projectMembersNote && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border text-sm">
                    <Users className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>{projectMembersNote}</span>
                  </div>
                )}
              </div>
            )}

            {/* User Checkbox List (when type === "group" or "team") */}
            {(channelType === "group" || channelType === "team") && (
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
                            <AvatarImage src={u.avatarUrl || undefined} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
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

            {/* Direct Message User Selection (when type === "direct") */}
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
                            <AvatarImage src={u.avatarUrl || undefined} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
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
                (channelType === "project" && !selectedProjectId) ||
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