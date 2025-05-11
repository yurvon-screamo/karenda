"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui"
import { RefreshCw, CalendarDays, Settings2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CalDAVSyncDialog } from "./caldav-sync-dialog"
import { OutlookSyncDialog } from "./outlook-sync-dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { CalendarEvent, CalendarIntegrationSettings, CalendarSource } from "@/lib/types"
import { v4 as uuidv4 } from 'uuid'

interface CalendarSyncManagerProps {
  onSyncComplete: (events: CalendarEvent[]) => void
}

export function CalendarSyncManager({ onSyncComplete }: CalendarSyncManagerProps) {
  const [settings, setSettings] = useState<CalendarIntegrationSettings>({ sources: [] })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedProtocol, setSelectedProtocol] = useState<"ews" | "caldav" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem("calendarIntegrationSettings")
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings)
          setSettings(parsedSettings)
        } catch (e) {
          console.error("Ошибка при загрузке настроек:", e)
        }
      }
    }
  }, [])

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = (newSource: CalendarSource) => {
    setSettings(prevSettings => {
      const updatedSettings = {
        sources: [...(prevSettings?.sources || []), { ...newSource, id: uuidv4() }]
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem("calendarIntegrationSettings", JSON.stringify(updatedSettings))
      }
      return updatedSettings
    })
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
    setSelectedProtocol(null)
  }

  const handleSync = async () => {
    if (settings.sources.length === 0) {
      toast({
        title: "Настройки не найдены",
        description: "Пожалуйста, настройте интеграцию календаря",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)

    try {
      let allSyncedEvents: CalendarEvent[] = []

      for (const source of settings.sources) {
        try {
          let syncedEvents: CalendarEvent[] = []

          if (source.protocol === "ews") {
            syncedEvents = await syncWithEWS(source)
          } else if (source.protocol === "caldav") {
            syncedEvents = await syncWithCalDAV(source)
          }

          console.log(`События от источника ${source.name}:`, syncedEvents)
          allSyncedEvents = [...allSyncedEvents, ...syncedEvents]
        } catch (error) {
          console.error(`Ошибка синхронизации для источника ${source.name}:`, error)
          toast({
            title: `Ошибка синхронизации для ${source.name}`,
            description: error instanceof Error ? error.message : "Произошла ошибка при синхронизации",
            variant: "destructive",
          })
        }
      }

      console.log("Все синхронизированные события:", allSyncedEvents)

      // Сохраняем события в localStorage
      const savedEvents = localStorage.getItem("syncedCalendarEvents") || "[]"
      const existingEvents = JSON.parse(savedEvents)

      // Объединяем все события
      const allEvents = [...existingEvents, ...allSyncedEvents]

      // Оставляем только уникальные события, при дублировании берем последнее
      const uniqueEvents = allEvents.reduce((acc: CalendarEvent[], current: CalendarEvent) => {
        const existingIndex = acc.findIndex(event =>
          event.source === current.source &&
          String(event.id).split('-')[1] === String(current.id).split('-')[1]
        )

        if (existingIndex === -1) {
          // Если такого события еще нет, добавляем его
          acc.push(current)
        } else {
          // Если событие уже есть, заменяем его на новое
          acc[existingIndex] = current
        }

        return acc
      }, [])

      localStorage.setItem("syncedCalendarEvents", JSON.stringify(uniqueEvents))

      console.log("События после сохранения:", uniqueEvents)
      onSyncComplete(uniqueEvents)
    } catch (error) {
      console.error("Общая ошибка синхронизации:", error)
      toast({
        title: "Ошибка синхронизации",
        description: error instanceof Error ? error.message : "Произошла ошибка при синхронизации",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const syncWithEWS = async (source: CalendarSource) => {
    if (!source.ews) throw new Error("Отсутствуют настройки EWS")

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())

    try {
      const response = await fetch("/api/outlook-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: source.ews.email,
          password: source.ews.password,
          serverUrl: source.ews.serverUrl,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || "Ошибка синхронизации с Outlook")
        } catch (e) {
          throw new Error(`Ошибка сервера: ${response.status} ${errorText}`)
        }
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Неверный формат ответа от сервера")
      }

      const data = await response.json()
      const events = data.events || []

      // Преобразуем события из формата Outlook в формат приложения
      return events.map((event: any) => {
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)

        return {
          id: `${source.name}-${event.id}-${Date.now()}`,
          title: event.title,
          date: startDate.toISOString().split('T')[0],
          time: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
          endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
          location: event.location || '',
          description: event.description || '',
          isAllDay: event.isAllDay || false,
          isSynced: true,
          source: source.name
        }
      })
    } catch (error) {
      console.error("Ошибка синхронизации с Outlook:", error)
      throw error
    }
  }

  const syncWithCalDAV = async (source: CalendarSource) => {
    if (!source.caldav) throw new Error("Отсутствуют настройки CalDAV")

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    try {
      const response = await fetch("/api/caldav-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: source.caldav.serverUrl,
          username: source.caldav.username,
          password: source.caldav.password,
          calendarId: source.caldav.calendarId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || "Ошибка синхронизации с CalDAV")
        } catch (e) {
          throw new Error(`Ошибка сервера: ${response.status} ${errorText}`)
        }
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Неверный формат ответа от сервера")
      }

      const data = await response.json()
      const events = data.events || []

      // Преобразуем события из формата CalDAV в формат приложения
      return events.map((event: any) => {
        const startDate = new Date(event.start)
        const endDate = new Date(event.end)

        return {
          id: `${source.name}-${event.id}-${Date.now()}`,
          title: event.title,
          date: startDate.toISOString().split('T')[0],
          time: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
          endTime: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
          location: event.location || '',
          description: event.description || '',
          isAllDay: event.isAllDay || false,
          isSynced: true,
          source: source.name
        }
      })
    } catch (error) {
      console.error("Ошибка синхронизации с CalDAV:", error)
      throw error
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10"
        onClick={handleSync}
        disabled={isSyncing}
        title="Синхронизировать календарь"
      >
        <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="sr-only">Синхронизировать календарь</span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10"
        onClick={handleOpenSettings}
        title="Настройки синхронизации"
      >
        <Settings2 className="h-5 w-5" />
        <span className="sr-only">Настройки синхронизации</span>
      </Button>

      <Drawer open={isSettingsOpen} onOpenChange={handleCloseSettings} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <DrawerTitle>Настройки синхронизации</DrawerTitle>
              </div>
              <DrawerClose onClick={handleCloseSettings} />
            </div>
          </DrawerHeader>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Источники календаря</h3>
              {settings?.sources?.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg mb-2">
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.protocol === 'ews' ? 'Outlook' : 'CalDAV'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updatedSettings = {
                        sources: settings.sources.filter(s => s.id !== source.id)
                      }
                      setSettings(updatedSettings)
                      localStorage.setItem("calendarIntegrationSettings", JSON.stringify(updatedSettings))
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className={cn(
                  "h-24 flex flex-col items-center justify-center gap-2",
                  selectedProtocol === "caldav" && "border-primary"
                )}
                onClick={() => setSelectedProtocol("caldav")}
              >
                <CalendarDays className="h-8 w-8" />
                <span>CalDAV</span>
              </Button>
              <Button
                variant="outline"
                className={cn(
                  "h-24 flex flex-col items-center justify-center gap-2",
                  selectedProtocol === "ews" && "border-primary"
                )}
                onClick={() => setSelectedProtocol("ews")}
              >
                <CalendarDays className="h-8 w-8" />
                <span>Outlook</span>
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {selectedProtocol === "caldav" && (
        <CalDAVSyncDialog
          onSyncComplete={onSyncComplete}
          onSettingsSave={handleSaveSettings}
          isOpen={selectedProtocol === "caldav"}
          onOpenChange={(open) => !open && setSelectedProtocol(null)}
        />
      )}

      {selectedProtocol === "ews" && (
        <OutlookSyncDialog
          onSyncComplete={onSyncComplete}
          onSettingsSave={handleSaveSettings}
          isOpen={selectedProtocol === "ews"}
          onOpenChange={(open) => !open && setSelectedProtocol(null)}
        />
      )}
    </div>
  )
}
