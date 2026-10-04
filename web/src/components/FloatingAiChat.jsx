import React, { useState } from "react";
import IntegratedAiChat from "@/components/integrated-ai-chat.jsx";
import { Button } from "@/components/ui/button.jsx";
import { MessageSquare, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils.js";

export default function FloatingAiChat({
  className,
  endpointUrl = "/integrated-ai/stream",
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col items-end",
        className,
      )}
    >
      {isOpen && (
        <div className="mb-4 w-[380px] h-[550px] max-h-[80vh] bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold text-sm">
                BeautyFlow Assistant AI
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-white rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 bg-background overflow-hidden relative">
            <IntegratedAiChat endpointUrl={endpointUrl} />
          </div>
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          isOpen
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70",
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}