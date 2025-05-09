"use client"

import { cn } from "@/lib/utils"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { Loader2, CalendarDays } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui"

interface CalDAVSyncDialogProps {
  onSyncComplete: (events: any[]) => void
}

export function CalDAVSyncDialog({ onSyncComplete }: CalDAVSyncDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    serverUrl: "",
    username: "",
    password: "",
    calendarId: "",
  })
  const [availableCalendars, setAvailableCalendars] = useState<{ url: string; displayName: string }[]>([])
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFetchCalendars = async () => {
    if (!formData.serverUrl || !formData.username || !formData.password) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Получаем текущий месяц для тестового запроса
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Отправляем запрос на получение списка календарей
      const response = await fetch("/api/caldav-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: formData.serverUrl,
          username: formData.username,
          password: formData.password,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Ошибка подключения")
      }

      // Сохраняем список доступных календарей
      if (data.calendars && data.calendars.length > 0) {
        setAvailableCalendars(
          data.calendars.map((cal: any) => ({
            url: cal.url,
            displayName: cal.displayName || "Календарь без имени",
          })),
        )

        toast({
          title: "Календари получены",
          description: `Найдено ${data.calendars.length} календарей`,
        })
      } else {
        toast({
          title: "Календари не найдены",
          description: "Не удалось найти календари на указанном сервере",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Ошибка при получении календарей:", error)
      toast({
        title: "Ошибка подключения",
        description: error instanceof Error ? error.message : "Произошла ошибка при подключении к серверу CalDAV",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    if (!formData.serverUrl || !formData.username || !formData.password || !formData.calendarId) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля и выберите календарь",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Получаем текущий месяц для синхронизации
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Отправляем запрос на синхронизацию
      const response = await fetch("/api/caldav-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: formData.serverUrl,
          username: formData.username,
          password: formData.password,
          calendarId: formData.calendarId,
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
        description: `Получено ${data.events.length} событий из CalDAV`,
      })

      // Закрываем диалог
      setIsOpen(false)
    } catch (error) {
      console.error("Ошибка синхронизации:", error)
      toast({
        title: "Ошибка синхронизации",
        description: error instanceof Error ? error.message : "Произошла ошибка при синхронизации с CalDAV",
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
        title="Синхронизация с CalDAV"
      >
        <CalendarDays className="h-5 w-5" />
        <span className="sr-only">Синхронизация с CalDAV</span>
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <DrawerTitle>Синхронизация с CalDAV</DrawerTitle>
              </div>
              <DrawerClose onClick={() => setIsOpen(false)} />
            </div>
          </DrawerHeader>

          <DrawerBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverUrl" className="text-white/70">
                  URL сервера CalDAV
                </Label>
                <Input
                  id="serverUrl"
                  name="serverUrl"
                  placeholder="https://caldav.example.com/dav/"
                  value={formData.serverUrl}
                  onChange={handleInputChange}
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/70">
                  Имя пользователя
                </Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="username"
                  value={formData.username}
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

              <div className="flex justify-end">
                <Button
                  onClick={handleFetchCalendars}
                  disabled={isLoading}
                  variant="outline"
                  className="border-primary/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    "Получить календари"
                  )}
                </Button>
              </div>

              {availableCalendars.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-primary/10">
                  <Label htmlFor="calendarId" className="text-white/70">
                    Выберите календарь
                  </Label>
                  <Select
                    value={formData.calendarId}
                    onValueChange={(value) => handleSelectChange("calendarId", value)}
                  >
                    <SelectTrigger className="bg-secondary/50 border-primary/20 text-white">
                      <SelectValue placeholder="Выберите календарь" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                      {availableCalendars.map((cal) => (
                        <SelectItem key={cal.url} value={cal.url}>
                          {cal.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </DrawerBody>

          <DrawerFooter>
            <Button
              onClick={handleSync}
              disabled={isLoading || !formData.calendarId}
              className={cn(
                "w-full rounded-full bg-primary hover:bg-primary/80",
                !formData.calendarId ? "opacity-50 cursor-not-allowed" : "",
              )}
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
