import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Send, Hash, Users, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/useAuth";
import { useChat, useMessages, useSendMessage } from "@/hooks/useChat";
import { useChatStore } from "@/store/use-chat-store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function ChatWindow() {
  const { selectedChatId } = useChatStore();
  const { data: currentUser } = useCurrentUser();
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Connect to WS for real-time updates
  useWebSocket(selectedChatId);

  const { data: chat, isLoading: isChatLoading } = useChat(selectedChatId);

  const { data: messages, isLoading: isMessagesLoading } = useMessages(selectedChatId);

  const sendMutation = useSendMessage();

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
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 glass-panel rounded-3xl max-w-md"
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
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Spinner size={32} />
      </div>
    );
  }

  if (!chat) return null;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-4">
          <img 
            src={getAvatarUrl(chat.name || "Chat")} 
            alt={chat.name || "Chat"} 
            className="w-10 h-10 rounded-full bg-zinc-800" 
          />
          <div>
            <h2 className="font-semibold text-white leading-tight">
              {chat.name || "Direct Message"}
            </h2>
            <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
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
        <button className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-24 pb-6 scroll-smooth"
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
                    "flex max-w-[75%]",
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
                        "px-4 py-2.5 shadow-sm text-[15px] leading-relaxed",
                        isMine 
                          ? "bg-primary text-white rounded-2xl rounded-tr-sm" 
                          : "bg-zinc-800 border border-white/5 text-zinc-100 rounded-2xl rounded-tl-sm"
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 mx-1">
                      {format(new Date(message.createdAt), "HH:mm")}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/5">
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
              className="w-full max-h-32 min-h-[44px] bg-transparent text-white placeholder:text-zinc-500 px-4 py-3 resize-none focus:outline-none"
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
      </div>
    </div>
  );
}
