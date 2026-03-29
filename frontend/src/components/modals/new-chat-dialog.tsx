import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X, Users, MessageSquarePlus, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateChat, useSearchUsers } from "@/hooks/useChat";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useChatStore } from "@/store/use-chat-store";
import { queryKeys } from "@/utils/constants";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();
  const setSelectedChatId = useChatStore((s) => s.setSelectedChatId);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users, isLoading: isSearching } = useSearchUsers(debouncedSearch);

  const createMutation = useCreateChat();

  const reset = () => {
    setSearch("");
    setIsGroup(false);
    setGroupName("");
    setSelectedUsers(new Set());
  };

  const toggleUser = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUsers(next);
  };

  const handleCreate = () => {
    if (selectedUsers.size === 0) return;
    if (isGroup && !groupName) return;

    createMutation.mutate(
      {
        isGroup,
        name: isGroup ? groupName : null,
        memberUserIds: Array.from(selectedUsers),
      },
      {
        onSuccess: (newChat) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.chats });
          setSelectedChatId(newChat.id);
          onOpenChange(false);
          reset();
        },
      },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-zinc-950 border border-white/10 p-6 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-display font-bold text-white flex items-center gap-2">
              {isGroup ? <Users className="w-5 h-5 text-primary" /> : <MessageSquarePlus className="w-5 h-5 text-primary" />}
              {isGroup ? "Create Group Chat" : "New Direct Message"}
            </Dialog.Title>
            <Dialog.Close className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="flex gap-2 mb-6 p-1 bg-zinc-900 rounded-lg">
            <button
              onClick={() => { setIsGroup(false); setSelectedUsers(new Set()); }}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                !isGroup ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              Direct
            </button>
            <button
              onClick={() => setIsGroup(true)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                isGroup ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              Group
            </button>
          </div>

          {isGroup && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 text-white placeholder:text-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/5 text-white placeholder:text-zinc-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="h-64 overflow-y-auto pr-2 -mr-2 mb-6">
            {isSearching ? (
              <div className="flex items-center justify-center h-full">
                <Spinner />
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => {
                  const isSelected = selectedUsers.has(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (!isGroup) {
                          setSelectedUsers(new Set([user.id]));
                        } else {
                          toggleUser(user.id);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-primary/10 border-primary/30" 
                          : "bg-zinc-900/50 border-transparent hover:bg-zinc-800"
                      )}
                    >
                      <img src={getAvatarUrl(user.username)} alt={user.username} className="w-10 h-10 rounded-full bg-zinc-800" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{user.username}</div>
                        <div className="text-xs text-zinc-400 truncate">{user.email}</div>
                      </div>
                      {isGroup && (
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary text-white" : "border-zinc-600"
                        )}>
                          {isSelected && <UserPlus className="w-3 h-3" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : debouncedSearch ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p>Type to search users</p>
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={selectedUsers.size === 0 || (isGroup && !groupName) || createMutation.isPending}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? <Spinner size={20} className="text-white" /> : "Start Chat"}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
