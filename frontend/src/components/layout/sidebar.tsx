import { useState } from "react";
import { format } from "date-fns";
import { LogOut, Plus, Search, MessageSquare } from "lucide-react";
import { useCurrentUser, logout } from "@/hooks/useAuth";
import { useChats } from "@/hooks/useChat";
import { useChatStore } from "@/store/use-chat-store";
import { NewChatDialog } from "@/components/modals/new-chat-dialog";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";

export function Sidebar() {
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const { selectedChatId, setSelectedChatId } = useChatStore();
  const queryClient = useQueryClient();

  const { data: currentUser } = useCurrentUser();
  const { data: chats, isLoading } = useChats();

  const handleLogout = () => {
    logout(queryClient);
    window.location.href = "/login";
  };

  return (
    <div className="w-80 flex-shrink-0 bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 p-0.5">
            <img 
              src={currentUser ? getAvatarUrl(currentUser.username) : ''} 
              alt="Profile" 
              className="w-full h-full rounded-full border-2 border-zinc-950 bg-zinc-800"
            />
          </div>
          <div>
            <h2 className="font-display font-bold text-white leading-tight">Messages</h2>
            <p className="text-xs text-zinc-400">@{currentUser?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-zinc-900/50 border border-white/5 text-sm text-white placeholder:text-zinc-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : chats && chats.length > 0 ? (
          chats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            
            // Derive display name for direct chats (API should ideally handle this, 
            // but assuming name is null for DMs and we just display standard text if we don't have other user info)
            const displayName = chat.isGroup ? chat.name : (chat.name || "Direct Message");
            
            return (
              <div
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all relative overflow-hidden group",
                  isSelected 
                    ? "bg-primary/10 border-white/5" 
                    : "hover:bg-white/5 border-transparent"
                )}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                )}
                
                <div className="relative">
                  <img 
                    src={getAvatarUrl(displayName!)} 
                    alt={displayName!} 
                    className="w-12 h-12 rounded-full bg-zinc-800" 
                  />
                  {chat.isGroup && (
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-700 rounded-full p-0.5">
                      <Users className="w-3 h-3 text-zinc-300" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={cn(
                      "text-sm font-semibold truncate",
                      isSelected ? "text-white" : "text-zinc-200 group-hover:text-white"
                    )}>
                      {displayName}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">
                        {format(new Date(chat.lastMessage.createdAt), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs truncate",
                    isSelected ? "text-primary/80" : "text-zinc-500"
                  )}>
                    {chat.lastMessage ? (
                      <span>
                        <span className="font-medium">{chat.lastMessage.username}: </span>
                        {chat.lastMessage.content}
                      </span>
                    ) : (
                      "No messages yet"
                    )}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <MessageSquare className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">No chats yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Click the + button to start one.</p>
          </div>
        )}
      </div>

      <NewChatDialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen} />
    </div>
  );
}

function Users(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
