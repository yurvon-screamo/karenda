"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui"
import { RefreshCw, CalendarDays, Settings2 } from "lucide-react"
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

interface IntegrationSettingsType {
  protocol: "ews" | "caldav"
  autoSync: boolean
  syncInterval: number
  ews?: {
    email: string
    password: string
    serverUrl?: string
  }
  caldav?: {
    serverUrl: string
    username: string
    password: string
    calendarId: string
  }
}

interface CalendarSyncManagerProps {
  onSyncComplete: (events: any[]) => void
}

export function CalendarSyncManager({ onSyncComplete }: CalendarSyncManagerProps) {
  const [settings, setSettings] = useState<IntegrationSettingsType | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedProtocol, setSelectedProtocol] = useState<"ews" | "caldav" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const savedSettings = localStorage.getItem("calendarIntegrationSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      } catch (e) {
        console.error("Ошибка при загрузке настроек:", e)
      }
    }
  }, [])

  const handleOpenSettings = () => {
    const savedSettings = localStorage.getItem("calendarIntegrationSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        if (parsedSettings.protocol) {
          setSelectedProtocol(parsedSettings.protocol)
        }
      } catch (e) {
        console.error("Ошибка при загрузке настроек:", e)
      }
    }
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = (newSettings: IntegrationSettingsType) => {
    setSettings(newSettings)
    localStorage.setItem("calendarIntegrationSettings", JSON.stringify(newSettings))
    // setIsSettingsOpen(false)
    // setSelectedProtocol(null)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
    setSelectedProtocol(null)
  }

  const handleSync = async () => {
    if (!settings) {
      toast({
        title: "Настройки не найдены",
        description: "Пожалуйста, настройте интеграцию календаря",
        variant: "destructive",
      })
      return
    }

    setIsSyncing(true)

    try {
      if (settings.protocol === "ews") {
        await syncWithEWS()
      } else if (settings.protocol === "caldav") {
        await syncWithCalDAV()
      }
    } catch (error) {
      console.error("Ошибка синхронизации:", error)
      toast({
        title: "Ошибка синхронизации",
        description: error instanceof Error ? error.message : "Произошла ошибка при синхронизации",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Синхронизация с EWS
  const syncWithEWS = async () => {
    if (!settings?.ews?.email || !settings?.ews?.password) {
      throw new Error("Отсутствуют учетные данные EWS")
    }

    // Получаем текущий месяц для запроса
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
        email: settings.ews.email,
        password: settings.ews.password,
        serverUrl: settings.ews.serverUrl,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Ошибка синхронизации с EWS")
    }

    // Передаем события в родительский компонент
    onSyncComplete(data.events)

    toast({
      title: "Синхронизация завершена",
      description: `Получено ${data.events.length} событий из Exchange`,
    })
  }

  // Синхронизация с CalDAV
  const syncWithCalDAV = async () => {
    if (!settings?.caldav?.serverUrl || !settings?.caldav?.username || !settings?.caldav?.password) {
      throw new Error("Отсутствуют учетные данные CalDAV")
    }

    // Получаем текущий месяц для запроса
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
        serverUrl: settings.caldav.serverUrl,
        username: settings.caldav.username,
        password: settings.caldav.password,
        calendarId: settings.caldav.calendarId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Ошибка синхронизации с CalDAV")
    }

    console.log("data", data)
    // Передаем события в родительский компонент
    onSyncComplete(data.events)

    toast({
      title: "Синхронизация завершена",
      description: `Получено ${data.events.length} событий из CalDAV`,
    })
  }

  // Автоматическая синхронизация при загрузке
  useEffect(() => {
    if (settings?.autoSync) {
      handleSync()

      // Настраиваем интервал синхронизации
      const interval = setInterval(
        () => {
          handleSync()
        },
        settings.syncInterval * 60 * 1000,
      ) // Преобразуем минуты в миллисекунды

      return () => clearInterval(interval)
    }
  }, [settings])

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

          <div className="grid grid-cols-2 gap-4 p-6">
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
