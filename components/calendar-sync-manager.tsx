"use client"

import { useState, useEffect } from "react"
import { Button } from "./button"
import { RefreshCw } from "lucide-react"
import {
  IntegrationSettings,
  type IntegrationSettings as IntegrationSettingsType,
} from "@/components/integration-settings"
import { useToast } from "@/hooks/use-toast"

interface CalendarSyncManagerProps {
  onSyncComplete: (events: any[]) => void
}

export function CalendarSyncManager({ onSyncComplete }: CalendarSyncManagerProps) {
  const [settings, setSettings] = useState<IntegrationSettingsType | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  // Загрузка настроек из localStorage при монтировании
  useEffect(() => {
    const savedSettings = localStorage.getItem("calendarIntegrationSettings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error("Ошибка при загрузке настроек:", e)
      }
    }
  }, [])

  // Сохранение настроек
  const handleSaveSettings = (newSettings: IntegrationSettingsType) => {
    setSettings(newSettings)
    localStorage.setItem("calendarIntegrationSettings", JSON.stringify(newSettings))
  }

  // Синхронизация в зависимости от выбранного протокола
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

      <IntegrationSettings onSaveSettings={handleSaveSettings} currentSettings={settings || undefined} />
    </div>
  )
}
