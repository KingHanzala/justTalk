import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isError || (!isLoading && !user)) {
      setLocation("/login");
    }
  }, [isError, isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950">
        <Spinner size={48} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden text-white">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
