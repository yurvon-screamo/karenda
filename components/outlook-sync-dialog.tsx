"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CalendarIcon, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

interface OutlookSyncDialogProps {
  onSyncComplete: (events: any[]) => void
}

export function OutlookSyncDialog({ onSyncComplete }: OutlookSyncDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    serverUrl: "",
  })
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSync = async () => {
    if (!formData.email || !formData.password) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите email и пароль",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Получаем даты для синхронизации (текущий месяц)
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Отправляем запрос на синхронизацию
      const response = await fetch("/api/outlook-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ошибка синхронизации")
      }

      // Обрабатываем полученные события
      onSyncComplete(data.events)

      toast({
        title: "Синхронизация завершена",
        description: `Получено ${data.events.length} событий из Outlook`,
      })

      // Закрываем диалог
      setIsOpen(false)
    } catch (error) {
      console.error("Ошибка синхронизации:", error)
      toast({
        title: "Ошибка синхронизации",
        description: error instanceof Error ? error.message : "Произошла ошибка при синхронизации с Outlook",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10"
        onClick={() => setIsOpen(true)}
        title="Синхронизация с Outlook"
      >
        <RefreshCw className="h-5 w-5" />
        <span className="sr-only">Синхронизация с Outlook</span>
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <DrawerTitle>Синхронизация с Outlook</DrawerTitle>
              </div>
              <DrawerClose onClick={() => setIsOpen(false)} />
            </div>
          </DrawerHeader>

          <DrawerBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">
                  Пароль
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serverUrl" className="text-white/70">
                  URL сервера Exchange (необязательно)
                </Label>
                <Input
                  id="serverUrl"
                  name="serverUrl"
                  placeholder="https://outlook.office365.com/EWS/Exchange.asmx"
                  value={formData.serverUrl}
                  onChange={handleInputChange}
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                />
                <p className="text-xs text-white/50">Оставьте пустым для автоматического определения</p>
              </div>
            </div>
          </DrawerBody>

          <DrawerFooter>
            <Button
              onClick={handleSync}
              disabled={isLoading}
              className="w-full rounded-full bg-primary hover:bg-primary/80"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Синхронизация...
                </>
              ) : (
                "Синхронизировать"
              )}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
