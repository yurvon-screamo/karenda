"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CalendarDays, CheckCircle2 } from "lucide-react"
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
import { CalendarEvent, CalendarIntegrationSettings } from "@/lib/types"

const CALENDAR_SETTINGS_KEY = 'calendarIntegrationSettings'
const SYNC_INTERVAL = 2 // minutes

interface CalDAVFormData {
    serverUrl: string
    username: string
    password: string
    calendarId: string
}

interface Calendar {
    url: string
    displayName: string
    id: string
}

interface CalDAVResponse {
    calendars: {
        url: string
        displayName?: string
    }[]
    events?: CalendarEvent[]
    error?: string
}

interface CalDAVSyncDialogProps {
    onSyncComplete: (events: CalendarEvent[]) => void
    onSettingsSave?: (settings: CalendarIntegrationSettings) => void
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

const CalDAVForm = ({
    formData,
    onInputChange,
    isLoading,
    onFetchCalendars,
    isConnectionVerified
}: {
    formData: CalDAVFormData
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    isLoading: boolean
    onFetchCalendars: () => void
    isConnectionVerified: boolean
}) => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="serverUrl" className="text-white/70">
                URL сервера CalDAV
            </Label>
            <Input
                id="serverUrl"
                name="serverUrl"
                placeholder="https://caldav.yandex.ru"
                value={formData.serverUrl}
                onChange={onInputChange}
                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                disabled={isConnectionVerified}
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
                onChange={onInputChange}
                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                disabled={isConnectionVerified}
            />
            <p className="text-sm text-white/50">
                Введите полный email адрес Яндекс.Почты. Если включена двухфакторная аутентификация, используйте пароль для приложений
            </p>
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
                onChange={onInputChange}
                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                disabled={isConnectionVerified}
            />
        </div>

        <div className="flex justify-end">
            {!isConnectionVerified ? (
                <Button
                    onClick={onFetchCalendars}
                    disabled={isLoading || !formData.serverUrl || !formData.username || !formData.password}
                    variant="outline"
                    className="border-primary/20"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Проверка подключения...
                        </>
                    ) : (
                        "Проверить подключение"
                    )}
                </Button>
            ) : (
                <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Подключение проверено</span>
                </div>
            )}
        </div>
    </div>
)

const CalendarSelector = ({
    calendars,
    selectedCalendarId,
    onSelectChange
}: {
    calendars: Calendar[]
    selectedCalendarId: string
    onSelectChange: (name: string, value: string) => void
}) => (
    <div className="space-y-2 mt-4 pt-4 border-t border-primary/10">
        <Label htmlFor="calendarId" className="text-white/70">
            Выберите календарь
        </Label>
        <Select
            value={calendars.find(cal => cal.id === selectedCalendarId)?.url || ""}
            onValueChange={(value) => onSelectChange("calendarId", value)}
        >
            <SelectTrigger className="bg-secondary/50 border-primary/20 text-white">
                <SelectValue placeholder="Выберите календарь" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                {calendars.map((cal) => (
                    <SelectItem key={cal.url} value={cal.url}>
                        {cal.displayName}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
)

export function CalDAVSyncDialog({ onSyncComplete, onSettingsSave, isOpen: externalIsOpen, onOpenChange }: CalDAVSyncDialogProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false)
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
    const setIsOpen = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open)
        } else {
            setInternalIsOpen(open)
        }
    }
    const [isLoading, setIsLoading] = useState(false)
    const [isConnectionVerified, setIsConnectionVerified] = useState(false)
    const [formData, setFormData] = useState<CalDAVFormData>({
        serverUrl: "",
        username: "",
        password: "",
        calendarId: "",
    })
    const [availableCalendars, setAvailableCalendars] = useState<Calendar[]>([])
    const { toast } = useToast()

    const loadSettings = () => {
        const settings = localStorage.getItem(CALENDAR_SETTINGS_KEY)
        if (settings) {
            try {
                const data = JSON.parse(settings)
                if (data.caldav) {
                    setFormData({
                        serverUrl: data.caldav.serverUrl || "",
                        username: data.caldav.username || "",
                        password: data.caldav.password || "",
                        calendarId: data.caldav.calendarId || "",
                    })
                }
            } catch (e) {
                console.error('Error loading settings:', e)
            }
        }
    }

    const handleOpen = () => {
        setIsOpen(true)
        loadSettings()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(x => ({ ...x, [name]: value }))
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
            const now = new Date()
            const startDate = new Date(now.getFullYear() - 1, 0, 1)
            const endDate = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59)

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

            const data: CalDAVResponse = await response.json()

            if (data.error) {
                throw new Error(data.error)
            }

            if (!data.calendars || data.calendars.length === 0) {
                throw new Error("Не найдено доступных календарей")
            }

            const calendars = data.calendars.map(cal => ({
                url: cal.url,
                displayName: cal.displayName || "Без названия",
                id: cal.url
            }))

            setAvailableCalendars(calendars)
            setIsConnectionVerified(true)

            if (calendars.length === 1) {
                setFormData(prev => ({ ...prev, calendarId: calendars[0].url }))
            }

            toast({
                title: "Успех",
                description: "Подключение к календарю установлено",
            })
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

    const handleSelectChange = (name: string, value: string) => {
        const selectedCalendar = availableCalendars.find(cal => cal.url === value);
        if (selectedCalendar) {
            setFormData(x => ({ ...x, [name]: selectedCalendar.id }));
        }
    }

    const handleSync = async () => {
        if (!formData.serverUrl || !formData.username || !formData.password || !formData.calendarId) {
            toast({
                title: "Ошибка",
                description: "Пожалуйста, заполните все обязательные поля",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            const settings = {
                protocol: 'caldav' as const,
                autoSync: true,
                syncInterval: SYNC_INTERVAL,
                caldav: {
                    serverUrl: formData.serverUrl,
                    username: formData.username,
                    password: formData.password,
                    calendarId: formData.calendarId
                }
            }

            if (onSettingsSave) {
                onSettingsSave(settings)
            } else {
                localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(settings))
            }

            const now = new Date()
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

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

            // Получаем существующие ручные события
            const manualEventsStr = localStorage.getItem("manualCalendarEvents")
            const manualEvents: CalendarEvent[] = manualEventsStr ? JSON.parse(manualEventsStr) : []

            // Сохраняем синхронизированные события отдельно
            localStorage.setItem("syncedCalendarEvents", JSON.stringify(data.events))

            // Объединяем ручные и синхронизированные события
            const allEvents = [...manualEvents, ...data.events]

            onSyncComplete(allEvents)

            toast({
                title: "Синхронизация завершена",
                description: `Получено ${data.events.length} событий из CalDAV`,
            })

            setIsOpen(false)
        } catch (error) {
            console.error("Ошибка синхронизации:", error)
            toast({
                title: "Ошибка синхронизации",
                description: error instanceof Error ? error.message : "Произошла ошибка при синхронизации",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = () => {
        setIsConnectionVerified(false)
        setFormData({
            serverUrl: "",
            username: "",
            password: "",
            calendarId: "",
        })
        setAvailableCalendars([])
    }

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10"
                onClick={handleOpen}
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
                            <DrawerClose onClick={() => {
                                setIsOpen(false)
                                handleReset()
                            }} />
                        </div>
                    </DrawerHeader>

                    <DrawerBody>
                        <CalDAVForm
                            formData={formData}
                            onInputChange={handleInputChange}
                            isLoading={isLoading}
                            onFetchCalendars={handleFetchCalendars}
                            isConnectionVerified={isConnectionVerified}
                        />
                        {availableCalendars.length > 0 && (
                            <CalendarSelector
                                calendars={availableCalendars}
                                selectedCalendarId={formData.calendarId}
                                onSelectChange={handleSelectChange}
                            />
                        )}
                    </DrawerBody>

                    <DrawerFooter>
                        <Button
                            onClick={handleSync}
                            disabled={isLoading || !formData.calendarId || !isConnectionVerified}
                            className={cn(
                                "w-full rounded-full bg-primary hover:bg-primary/80",
                                (!formData.calendarId || !isConnectionVerified) ? "opacity-50 cursor-not-allowed" : "",
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
