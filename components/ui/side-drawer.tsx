"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SideDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function SideDrawer({ isOpen, onClose, children, className }: SideDrawerProps) {
  if (!isOpen) return null

  // Обработчик клика по оверлею
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Обработчик нажатия Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      // Блокируем прокрутку body
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      // Восстанавливаем прокрутку body
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={handleOverlayClick}
      aria-hidden="true"
    >
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-[90vw] bg-gradient-to-br from-[hsl(var(--background)/0.95)] via-[hsl(var(--card)/0.95)] to-[hsl(var(--background)/0.95)] backdrop-blur-md text-[hsl(var(--foreground))] border-l border-[hsl(var(--border)/0.2)] shadow-xl transition-transform duration-300 ease-in-out rounded-3xl",
          isOpen ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border)/0.1)]">
            <h2 className="text-xl font-semibold">Настройки интеграции</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Закрыть</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
