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
import { CalendarEvent, CalendarSource } from "@/lib/types"

const SYNC_INTERVAL = 2 // minutes

interface CalDAVFormData {
    name: string
    serverUrl: string
    username: string
    password: string
    calendarId: string
}

interface Calendar {
    id: string
    name: string
}

interface CalDAVSyncDialogProps {
    onSyncComplete: (events: CalendarEvent[]) => void
    onSettingsSave?: (source: CalendarSource) => void
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

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
        name: "",
        serverUrl: "",
        username: "",
        password: "",
        calendarId: "",
    })
    const [availableCalendars, setAvailableCalendars] = useState<Calendar[]>([])
    const { toast } = useToast()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(x => ({ ...x, [name]: value }))
    }

    const handleTestConnection = async () => {
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
            const response = await fetch("/api/caldav-test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    serverUrl: formData.serverUrl,
                    username: formData.username,
                    password: formData.password,
                }),
            })

            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                const errorText = await response.text()
                throw new Error(`Неверный формат ответа от сервера: ${errorText}`)
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Ошибка подключения")
            }

            setAvailableCalendars(data.calendars || [])
            setIsConnectionVerified(true)
            setFormData(prev => ({ ...prev }))

            toast({
                title: "Подключение успешно",
                description: "Выберите календарь для синхронизации",
            })
        } catch (error) {
            console.error("Ошибка при проверке подключения:", error)
            setIsConnectionVerified(false)
            setAvailableCalendars([])
            toast({
                title: "Ошибка подключения",
                description: error instanceof Error ? error.message : "Не удалось подключиться к серверу",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveSettings = () => {
        if (!formData.name || !formData.serverUrl || !formData.username || !formData.password || !formData.calendarId) {
            toast({
                title: "Ошибка",
                description: "Пожалуйста, заполните все обязательные поля",
                variant: "destructive",
            })
            return
        }

        const source: CalendarSource = {
            id: "", // Will be set by the parent component
            name: formData.name,
            protocol: 'caldav',
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
            onSettingsSave(source)
        }
        setIsOpen(false)
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
            const source: CalendarSource = {
                id: "", // Will be set by the parent component
                name: formData.name,
                protocol: 'caldav',
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
                onSettingsSave(source)
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

            onSyncComplete(data.events)
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

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerContent>
                <DrawerHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            <DrawerTitle>Настройки CalDAV</DrawerTitle>
                        </div>
                        <DrawerClose onClick={() => setIsOpen(false)} />
                    </div>
                </DrawerHeader>

                <DrawerBody>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Название календаря</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Например: Рабочий календарь"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serverUrl">URL сервера</Label>
                            <Input
                                id="serverUrl"
                                name="serverUrl"
                                value={formData.serverUrl}
                                onChange={handleInputChange}
                                placeholder="https://calendar.example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Имя пользователя</Label>
                            <Input
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                placeholder="user@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                            />
                        </div>

                        {isConnectionVerified && (
                            <div className="space-y-2">
                                <Label htmlFor="calendarId">Выберите календарь</Label>
                                <Select
                                    value={formData.calendarId}
                                    onValueChange={(value) => setFormData(x => ({ ...x, calendarId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите календарь" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCalendars.map((calendar) => (
                                            <SelectItem key={calendar.id} value={calendar.id}>
                                                {calendar.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </DrawerBody>

                <DrawerFooter>
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={isLoading || !formData.serverUrl || !formData.username || !formData.password}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Проверка...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Проверить подключение
                                </>
                            )}
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Отмена
                            </Button>
                            <Button
                                onClick={handleSaveSettings}
                                disabled={isLoading || !isConnectionVerified || !formData.calendarId}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Сохранение...
                                    </>
                                ) : (
                                    "Сохранить"
                                )}
                            </Button>
                        </div>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
