import { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { Send, Hash, Users, Info, Trash2, Shield, X, ChevronLeft, UserPlus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/useAuth";
import { useAddMember, useChat, useDeleteMessage, useMessages, useRemoveMember, useSearchUsers, useSendMessage } from "@/hooks/useChat";
import { useChatStore } from "@/store/use-chat-store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";

export function ChatWindow() {
  const { selectedChatId, setSelectedChatId } = useChatStore();
  const { data: currentUser } = useCurrentUser();
  const [content, setContent] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Connect to WS for real-time updates
  useWebSocket(selectedChatId);

  const { data: chat, isLoading: isChatLoading } = useChat(selectedChatId);

  const { data: messages, isLoading: isMessagesLoading } = useMessages(selectedChatId);

  const sendMutation = useSendMessage();
  const deleteMessageMutation = useDeleteMessage();
  const removeMemberMutation = useRemoveMember();
  const addMemberMutation = useAddMember();
  const { data: searchableUsers, isLoading: isSearchingUsers } = useSearchUsers(memberSearch);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || !selectedChatId) return;
    
    sendMutation.mutate(
      {
        chatId: selectedChatId,
        data: { content: content.trim() },
      },
      {
        onSuccess: () => {
          setContent("");
        },
      },
    );
  };

  if (!selectedChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/30 min-h-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 sm:p-8 glass-panel rounded-3xl max-w-md mx-4"
        >
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-12">
            <Hash className="w-8 h-8 -rotate-12" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">Welcome to Chat App</h2>
          <p className="text-zinc-400">Select a conversation from the sidebar or start a new one to begin messaging.</p>
        </motion.div>
      </div>
    );
  }

  if (isChatLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 min-h-0">
        <Spinner size={32} />
      </div>
    );
  }

  if (!chat) return null;

  const isAdmin = chat.members.some((member) => member.userId === currentUser?.id && member.role === "admin");
  const addableUsers = (searchableUsers ?? []).filter(
    (user) => !chat.members.some((member) => member.userId === user.id),
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && (
            <button
              type="button"
              onClick={() => setSelectedChatId(null)}
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full flex-shrink-0"
              aria-label="Back to chats"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <img 
            src={getAvatarUrl(chat.name || "Chat")} 
            alt={chat.name || "Chat"} 
            className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" 
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-white leading-tight truncate">
              {chat.name || "Direct Message"}
            </h2>
            <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
              {chat.isGroup ? (
                <>
                  <Users className="w-3 h-3" />
                  <span>{chat.members.length} members</span>
                </>
              ) : (
                <span>Direct Message</span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full flex-shrink-0"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-4 sm:pb-6 scroll-smooth overscroll-contain"
      >
        {isMessagesLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p>This is the start of your conversation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, idx) => {
              const isMine = message.userId === currentUser?.id;
              const showAvatar = !isMine && (idx === 0 || messages[idx - 1].userId !== message.userId);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={message.id}
                  className={cn(
                    "flex max-w-[88%] sm:max-w-[75%]",
                    isMine ? "ml-auto justify-end" : "mr-auto justify-start"
                  )}
                >
                  {!isMine && (
                    <div className="w-8 flex-shrink-0 mr-2">
                      {showAvatar && (
                        <img 
                          src={getAvatarUrl(message.username)} 
                          alt={message.username} 
                          className="w-8 h-8 rounded-full bg-zinc-800 mt-1" 
                        />
                      )}
                    </div>
                  )}
                  
                  <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                    {!isMine && showAvatar && (
                      <span className="text-xs text-zinc-500 mb-1 ml-1">{message.username}</span>
                    )}
                    <div
                      className={cn(
                        "px-3 sm:px-4 py-2.5 shadow-sm text-sm sm:text-[15px] leading-relaxed break-words",
                        message.isDeleted && "italic text-zinc-300",
                        isMine 
                          ? "bg-primary text-white rounded-2xl rounded-tr-sm" 
                          : "bg-zinc-800 border border-white/5 text-zinc-100 rounded-2xl rounded-tl-sm"
                      )}
                    >
                      {message.content}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 mx-1 flex items-center gap-2">
                      <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                      {chat.isGroup && chat.canWrite && isAdmin && !message.isDeleted && (
                        <button
                          type="button"
                          onClick={() => deleteMessageMutation.mutate({ chatId: chat.id, messageId: message.id })}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                          aria-label="Delete message for everyone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/5">
        {chat.canWrite ? (
          <form 
            onSubmit={handleSend}
            className="flex items-end gap-2 max-w-4xl mx-auto"
          >
            <div className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message ${chat.name || '...'}`}
                className="w-full max-h-32 min-h-[44px] bg-transparent text-white placeholder:text-zinc-500 px-4 py-3 resize-none focus:outline-none text-base"
                rows={1}
              />
            </div>
            <button
              type="submit"
              disabled={!content.trim() || sendMutation.isPending}
              className="w-12 h-[44px] flex-shrink-0 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary/20 disabled:shadow-none"
            >
              {sendMutation.isPending ? <Spinner size={18} className="text-white" /> : <Send className="w-5 h-5 ml-1" />}
            </button>
          </form>
        ) : (
          <div className="max-w-4xl mx-auto rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            You are no longer a member of this group. You can view earlier messages, but you cannot send new ones.
          </div>
        )}
      </div>

      <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-display font-bold">
                {chat.isGroup ? "Group Details" : "Chat Details"}
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-zinc-900/70 p-4">
              <img
                src={getAvatarUrl(chat.name || "Chat")}
                alt={chat.name || "Chat"}
                className="h-12 w-12 rounded-full bg-zinc-800"
              />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{chat.name || "Direct Message"}</div>
                <div className="text-sm text-zinc-400">{chat.members.length} members</div>
              </div>
            </div>
            {chat.isGroup && isAdmin && chat.canWrite && (
              <div className="mb-4 rounded-2xl border border-white/8 bg-zinc-900/50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Add Members
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search users to add..."
                    className="w-full rounded-xl border border-white/8 bg-zinc-950 px-10 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                {memberSearch ? (
                  <div className="max-h-44 space-y-2 overflow-y-auto">
                    {isSearchingUsers ? (
                      <div className="flex justify-center py-4">
                        <Spinner size={18} />
                      </div>
                    ) : addableUsers.length > 0 ? (
                      addableUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 rounded-xl bg-zinc-950/80 p-3">
                          <img
                            src={getAvatarUrl(user.username)}
                            alt={user.username}
                            className="h-9 w-9 rounded-full bg-zinc-800"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{user.username}</div>
                            <div className="truncate text-xs text-zinc-400">{user.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addMemberMutation.mutate({ chatId: chat.id, userId: user.id }, { onSuccess: () => setMemberSearch("") })}
                            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-primary/10 hover:text-primary"
                            aria-label={`Add ${user.username}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-sm text-zinc-500">No addable users found.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">Search for users to add or re-add to this group.</div>
                )}
              </div>
            )}
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {chat.members.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 rounded-xl bg-zinc-900/50 p-3">
                  <img
                    src={getAvatarUrl(member.username)}
                    alt={member.username}
                    className="h-10 w-10 rounded-full bg-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{member.username}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                      {member.role === "admin" && <Shield className="h-3 w-3 text-primary" />}
                      <span className="capitalize">{member.role}</span>
                    </div>
                  </div>
                  {chat.isGroup && isAdmin && chat.canWrite && member.userId !== currentUser?.id && (
                    <button
                      type="button"
                      onClick={() => removeMemberMutation.mutate({ chatId: chat.id, userId: member.userId })}
                      className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
                      aria-label={`Remove ${member.username}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
