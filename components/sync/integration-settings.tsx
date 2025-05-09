"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Switch } from "@/components/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { Settings, CalendarDays, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody, DrawerClose } from "@/components/ui"

interface IntegrationSettingsProps {
  onSaveSettings: (settings: IntegrationSettings) => void
  currentSettings?: IntegrationSettings
}

export interface IntegrationSettings {
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
    calendarId?: string
  }
}

export function IntegrationSettings({ onSaveSettings, currentSettings }: IntegrationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<IntegrationSettings>(
    currentSettings || {
      protocol: "ews",
      autoSync: false,
      syncInterval: 30,
    },
  )
  const [availableCalendars, setAvailableCalendars] = useState<{ url: string; displayName: string }[]>([])
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (section: "ews" | "caldav" | "general", name: string, value: string | boolean | number) => {
    if (section === "general") {
      setSettings((prev) => ({ ...prev, [name]: value }))
    } else {
      setSettings((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value,
        },
      }))
    }
  }

  const handleProtocolChange = (protocol: "ews" | "caldav") => {
    setSettings((prev) => ({ ...prev, protocol }))
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)

    try {
      if (settings.protocol === "caldav") {
        if (!settings.caldav?.serverUrl || !settings.caldav?.username || !settings.caldav?.password) {
          throw new Error("Пожалуйста, заполните все обязательные поля")
        }

        // Получаем текущий месяц для тестового запроса
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        // Отправляем запрос на тестовое подключение
        const response = await fetch("/api/caldav-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serverUrl: settings.caldav.serverUrl,
            username: settings.caldav.username,
            password: settings.caldav.password,
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
        }

        toast({
          title: "Подключение успешно",
          description: `Найдено ${data.calendars.length} календарей и ${data.events.length} событий`,
        })
      } else if (settings.protocol === "ews") {
        if (!settings.ews?.email || !settings.ews?.password) {
          throw new Error("Пожалуйста, заполните все обязательные поля")
        }

        // Получаем текущий месяц для тестового запроса
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        // Отправляем запрос на тестовое подключение
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
          throw new Error(data.error || "Ошибка подключения")
        }

        toast({
          title: "Подключение успешно",
          description: `Найдено ${data.events.length} событий`,
        })
      }
    } catch (error) {
      console.error("Ошибка при тестировании подключения:", error)
      toast({
        title: "Ошибка подключения",
        description: error instanceof Error ? error.message : "Произошла ошибка при подключении",
        variant: "destructive",
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSaveSettings = () => {
    onSaveSettings(settings)
    setIsOpen(false)
    toast({
      title: "Настройки сохранены",
      description: "Настройки интеграции успешно сохранены",
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10"
        onClick={() => setIsOpen(true)}
        title="Настройки интеграции"
      >
        <Settings className="h-5 w-5" />
        <span className="sr-only">Настройки интеграции</span>
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                <DrawerTitle>Настройки интеграции</DrawerTitle>
              </div>
              <DrawerClose onClick={() => setIsOpen(false)} />
            </div>
          </DrawerHeader>

          <DrawerBody className="p-6">
            <Tabs
              defaultValue={settings.protocol}
              className="w-full"
              onValueChange={(v) => handleProtocolChange(v as any)}
            >
              <TabsList className="grid grid-cols-2 mb-6 bg-secondary/30">
                <TabsTrigger value="ews" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Microsoft Exchange (EWS)
                </TabsTrigger>
                <TabsTrigger value="caldav" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  CalDAV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ews" className="space-y-6 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ews-email" className="text-white/70">
                    Email
                  </Label>
                  <Input
                    id="ews-email"
                    value={settings.ews?.email || ""}
                    onChange={(e) => handleInputChange("ews", "email", e.target.value)}
                    placeholder="your.email@example.com"
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ews-password" className="text-white/70">
                    Пароль
                  </Label>
                  <Input
                    id="ews-password"
                    type="password"
                    value={settings.ews?.password || ""}
                    onChange={(e) => handleInputChange("ews", "password", e.target.value)}
                    placeholder="••••••••"
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ews-server" className="text-white/70">
                    URL сервера Exchange (необязательно)
                  </Label>
                  <Input
                    id="ews-server"
                    value={settings.ews?.serverUrl || ""}
                    onChange={(e) => handleInputChange("ews", "serverUrl", e.target.value)}
                    placeholder="https://outlook.office365.com/EWS/Exchange.asmx"
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                  <p className="text-xs text-white/50">Оставьте пустым для автоматического определения</p>
                </div>
              </TabsContent>

              <TabsContent value="caldav" className="space-y-6 py-2">
                <div className="space-y-2">
                  <Label htmlFor="caldav-server" className="text-white/70">
                    URL сервера CalDAV
                  </Label>
                  <Input
                    id="caldav-server"
                    value={settings.caldav?.serverUrl || ""}
                    onChange={(e) => handleInputChange("caldav", "serverUrl", e.target.value)}
                    placeholder="https://caldav.example.com/dav/"
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caldav-username" className="text-white/70">
                    Имя пользователя
                  </Label>
                  <Input
                    id="caldav-username"
                    value={settings.caldav?.username || ""}
                    onChange={(e) => handleInputChange("caldav", "username", e.target.value)}
                    placeholder="username"
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caldav-password" className="text-white/70">
                    Пароль
                  </Label>
                  <Input
                    id="caldav-password"
                    type="password"
                    value={settings.caldav?.password || ""}
                    onChange={(e) => handleInputChange("caldav", "password", e.target.value)}
                    placeholder="••••••••"
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                </div>

                {availableCalendars.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="caldav-calendar" className="text-white/70">
                      Календарь
                    </Label>
                    <Select
                      value={settings.caldav?.calendarId || ""}
                      onValueChange={(value) => handleInputChange("caldav", "calendarId", value)}
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
              </TabsContent>

              <div className="border-t border-primary/10 mt-6 pt-6">
                <h3 className="text-lg font-medium mb-3">Общие настройки</h3>

                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-sync" className="text-white/70">
                      Автоматическая синхронизация
                    </Label>
                    <p className="text-xs text-white/50">Автоматически синхронизировать события при загрузке</p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={settings.autoSync}
                    onCheckedChange={(checked) => handleInputChange("general", "autoSync", checked)}
                  />
                </div>

                {settings.autoSync && (
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="sync-interval" className="text-white/70">
                      Интервал синхронизации (минуты)
                    </Label>
                    <Select
                      value={settings.syncInterval.toString()}
                      onValueChange={(value) => handleInputChange("general", "syncInterval", Number.parseInt(value))}
                    >
                      <SelectTrigger className="bg-secondary/50 border-primary/20 text-white">
                        <SelectValue placeholder="Выберите интервал" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                        <SelectItem value="15">15 минут</SelectItem>
                        <SelectItem value="30">30 минут</SelectItem>
                        <SelectItem value="60">1 час</SelectItem>
                        <SelectItem value="120">2 часа</SelectItem>
                        <SelectItem value="360">6 часов</SelectItem>
                        <SelectItem value="720">12 часов</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="border-primary/20"
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Проверка...
                      </>
                    ) : (
                      "Проверить подключение"
                    )}
                  </Button>

                  <Button onClick={handleSaveSettings} className="bg-primary hover:bg-primary/80">
                    Сохранить настройки
                  </Button>
                </div>
              </div>
            </Tabs>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
