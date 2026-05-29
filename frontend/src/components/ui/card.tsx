"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================ //
//  1. CARD COMPONENTS                                                          //
// ============================================================================ //

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "backdrop-blur-2xl bg-[#1E1B18]/70 border border-white/[0.07] rounded-[24px] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8)] overflow-hidden transition-theme",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6 border-b border-white/[0.05]", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-xl font-bold tracking-tight text-white font-display",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

// ============================================================================ //
//  2. BUTTON COMPONENT                                                         //
// ============================================================================ //

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-semibold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8D5B7]/50",
          variant === "default" && "bg-[#E8D5B7] text-[#1C1917] hover:bg-[#FAF8F5] shadow-[0_4px_16px_rgba(232,213,183,0.15)]",
          variant === "ghost" && "text-[#A09880] hover:text-[#F5F0E8] hover:bg-white/[0.04]",
          variant === "destructive" && "bg-[#C2410C] text-white hover:bg-[#C2410C]/90 shadow-[0_4px_16px_rgba(194,65,12,0.15)]",
          variant === "secondary" && "bg-white/[0.03] text-[#F5F0E8] border border-white/[0.07] hover:bg-white/[0.08]",
          size === "default" && "h-12 px-6",
          size === "sm" && "h-9 px-4 text-xs",
          size === "lg" && "h-14 px-8 text-base",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ============================================================================ //
//  3. TEXTAREA COMPONENT                                                       //
// ============================================================================ //

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 transition-all text-[#F5F0E8] placeholder-[#78716C] resize-none leading-relaxed",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ============================================================================ //
//  4. INPUT COMPONENT                                                          //
// ============================================================================ //

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 transition-all text-[#F5F0E8] placeholder-[#78716C]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ============================================================================ //
//  5. SELECT COMPONENTS (CUSTOM DROP-DOWN SYSTEM)                              //
// ============================================================================ //

interface SelectContextType {
  value?: string;
  onValueChange?: (val: string) => void;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectContext = createContext<SelectContextType | null>(null);

export const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used inside Select");
  return (
    <button
      type="button"
      ref={ref}
      onClick={() => context.setIsOpen(!context.isOpen)}
      className={cn(
        "flex h-12 w-full items-center justify-between bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 transition-all text-[#F5F0E8] text-left cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
      <span className="ml-2 text-[#A09880] text-[10px]">▼</span>
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used inside Select");
  return <span className="truncate">{context.value || placeholder}</span>;
};

export const SelectContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used inside Select");
  if (!context.isOpen) return null;
  return (
    <>
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={() => context.setIsOpen(false)}
      />
      <div
        className={cn(
          "absolute z-50 mt-2 w-full rounded-xl border border-white/[0.07] bg-[#1E1B18] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-in fade-in-50 slide-in-from-top-1",
          className
        )}
      >
        {children}
      </div>
    </>
  );
};

export const SelectItem = ({
  children,
  value,
  className,
}: {
  children: React.ReactNode;
  value: string;
  className?: string;
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used inside Select");
  const isSelected = context.value === value;
  return (
    <button
      type="button"
      onClick={() => {
        context.onValueChange?.(value);
        context.setIsOpen(false);
      }}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-sm text-[#A09880] hover:text-[#F5F0E8] hover:bg-white/[0.04] text-left transition-colors flex items-center justify-between cursor-pointer",
        isSelected && "bg-white/[0.04] text-[#E8D5B7] font-bold",
        className
      )}
    >
      <span>{children}</span>
      {isSelected && <span className="text-[#E8D5B7]">✓</span>}
    </button>
  );
};
