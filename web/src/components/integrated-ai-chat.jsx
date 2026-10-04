import React, { useRef, useState, useEffect } from "react";
import { useIntegratedAi } from "@/hooks/use-integrated-ai.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils.js";

export default function IntegratedAiChat({
  endpointUrl = "/integrated-ai/stream",
}) {
  const { messages, sendMessage, isStreaming, isLoadingHistory } =
    useIntegratedAi({ endpointUrl });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  if (isLoadingHistory) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-foreground">
          Chargement de la conversation...
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Veuillez patienter un instant.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground mt-12 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Bot className="h-8 w-8 text-primary/70" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Bonjour !</h3>
              <p className="text-sm max-w-[250px]">
                Comment puis-je vous aider aujourd'hui ?
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full shadow-sm border",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border text-card-foreground rounded-tl-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  {msg.images?.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt="Image générée"
                      className="mt-3 max-w-full rounded-md shadow-sm border"
                    />
                  ))}
                </div>
              </div>
            ))
          )}
          {isStreaming && (
            <div className="flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-card shadow-sm border border-border">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl bg-card border text-card-foreground px-4 py-3 text-sm shadow-sm rounded-tl-sm flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce"></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-px w-full" />
        </div>
      </ScrollArea>
      <div className="border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrivez votre message ici..."
            disabled={isStreaming}
            className="flex-1 rounded-full bg-muted/50 border-transparent focus-visible:bg-background focus-visible:ring-1"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="rounded-full shrink-0 transition-transform active:scale-95"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}