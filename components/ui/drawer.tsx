"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/components/ui"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  direction?: "right" | "left"
}

const Drawer = ({ open, onOpenChange, children, direction = "right" }: DrawerProps) => {
  // Обработчик нажатия Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      // Блокируем прокрутку body
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      // Восстанавливаем прокрутку body
      document.body.style.overflow = ""
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      onClick={() => onOpenChange(false)}
      aria-hidden="true"
    >
      <div
        className={cn(
          "fixed z-50 h-full bg-gradient-to-br from-[#1e1a2e]/95 via-[#1a1525]/95 to-[#1e1a2e]/95 backdrop-blur-md text-white shadow-xl transition-transform duration-300 ease-in-out",
          direction === "right" &&
          "right-0 top-0 bottom-0 w-[500px] max-w-[90vw] border-l border-primary/20 rounded-3xl",
          direction === "left" && "left-0 top-0 bottom-0 w-[500px] max-w-[90vw] border-r border-primary/20 rounded-3xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

const DrawerContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col h-full", className)}>{children}</div>
)

const DrawerHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex items-center justify-between p-4 border-b border-primary/20", className)}>{children}</div>
)

const DrawerTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("text-xl font-medium", className)}>{children}</h2>
)

const DrawerBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex-1 overflow-y-auto p-6", className)}>{children}</div>
)

const DrawerFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-4 border-t border-primary/20", className)}>{children}</div>
)

const DrawerClose = ({ onClick, className }: { onClick?: () => void; className?: string }) => (
  <Button
    variant="ghost"
    size="icon"
    className={cn("h-8 w-8 rounded-full hover:bg-white/10", className)}
    onClick={onClick}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Закрыть</span>
  </Button>
)

export { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter, DrawerClose }
