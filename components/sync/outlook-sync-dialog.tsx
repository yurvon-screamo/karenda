"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface EWSFormData {
    email: string
    password: string
    serverUrl?: string
}

interface OutlookSyncDialogProps {
    onSyncComplete: (events: CalendarEvent[]) => void
    onSettingsSave?: (settings: CalendarIntegrationSettings) => void
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

const EWSForm = ({
    formData,
    onInputChange,
    isLoading,
    onTestConnection,
    isConnectionVerified
}: {
    formData: EWSFormData
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    isLoading: boolean
    onTestConnection: () => void
    isConnectionVerified: boolean
}) => (
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
                onChange={onInputChange}
                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                disabled={isConnectionVerified}
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
                onChange={onInputChange}
                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                disabled={isConnectionVerified}
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
                value={formData.serverUrl || ""}
                onChange={onInputChange}
                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                disabled={isConnectionVerified}
            />
            <p className="text-sm text-white/50">
                Оставьте пустым для автоматического определения
            </p>
        </div>

        <div className="flex justify-end">
            {!isConnectionVerified ? (
                <Button
                    onClick={onTestConnection}
                    disabled={isLoading || !formData.email || !formData.password}
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

export function OutlookSyncDialog({ onSyncComplete, onSettingsSave, isOpen: externalIsOpen, onOpenChange }: OutlookSyncDialogProps) {
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
    const [formData, setFormData] = useState<EWSFormData>({
        email: "",
        password: "",
        serverUrl: "",
    })
    const { toast } = useToast()

    const loadSettings = () => {
        const settings = localStorage.getItem(CALENDAR_SETTINGS_KEY)
        if (settings) {
            try {
                const data = JSON.parse(settings)
                if (data.ews) {
                    setFormData({
                        email: data.ews.email || "",
                        password: data.ews.password || "",
                        serverUrl: data.ews.serverUrl || "",
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
        setFormData(prev => {
            const newData = { ...prev, [name]: value }
            saveSettings(name, value)
            return newData
        })
    }

    const saveSettings = (name: string, value: string) => {
        const settings = localStorage.getItem(CALENDAR_SETTINGS_KEY)
        const currentSettings = settings ? JSON.parse(settings) : {}
        const updatedSettings = {
            ...currentSettings,
            ews: {
                ...currentSettings.ews,
                [name]: value
            }
        }
        localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(updatedSettings))
    }

    const handleTestConnection = async () => {
        if (!formData.email || !formData.password) {
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
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

            const response = await fetch("/api/outlook-sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    serverUrl: formData.serverUrl,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Ошибка подключения")
            }

            setIsConnectionVerified(true)

            toast({
                title: "Подключение успешно",
                description: `Найдено ${data.events.length} событий`,
            })
        } catch (error) {
            console.error("Ошибка при тестировании подключения:", error)
            toast({
                title: "Ошибка подключения",
                description: error instanceof Error ? error.message : "Произошла ошибка при подключении",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveSettings = () => {
        const settings: CalendarIntegrationSettings = {
            protocol: 'ews' as const,
            autoSync: true,
            syncInterval: SYNC_INTERVAL,
            ews: {
                email: formData.email,
                password: formData.password,
                serverUrl: formData.serverUrl,
            }
        }
        if (onSettingsSave) {
            onSettingsSave(settings)
        }
        setIsOpen(false)
    }

    const handleSync = async () => {
        if (!formData.email || !formData.password) {
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
                protocol: 'ews' as const,
                autoSync: true,
                syncInterval: SYNC_INTERVAL,
                ews: {
                    email: formData.email,
                    password: formData.password,
                    serverUrl: formData.serverUrl
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

            const response = await fetch("/api/outlook-sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    serverUrl: formData.serverUrl,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Ошибка синхронизации")
            }

            onSyncComplete(data.events)

            toast({
                title: "Синхронизация завершена",
                description: `Получено ${data.events.length} событий из Outlook`,
            })

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

    const handleReset = () => {
        setIsConnectionVerified(false)
        setFormData({
            email: "",
            password: "",
            serverUrl: "",
        })
    }

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10"
                onClick={handleOpen}
                title="Синхронизация с Outlook"
            >
                <CalendarDays className="h-5 w-5" />
                <span className="sr-only">Синхронизация с Outlook</span>
            </Button>

            <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
                <DrawerContent>
                    <DrawerHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                <DrawerTitle>Синхронизация с Outlook</DrawerTitle>
                            </div>
                            <DrawerClose onClick={() => {
                                setIsOpen(false)
                                handleReset()
                            }} />
                        </div>
                    </DrawerHeader>

                    <DrawerBody>
                        <EWSForm
                            formData={formData}
                            onInputChange={handleInputChange}
                            isLoading={isLoading}
                            onTestConnection={handleTestConnection}
                            isConnectionVerified={isConnectionVerified}
                        />
                    </DrawerBody>

                    <DrawerFooter>
                        <Button
                            onClick={handleSync}
                            disabled={isLoading || !isConnectionVerified}
                            className={cn(
                                "w-full rounded-full bg-primary hover:bg-primary/80",
                                !isConnectionVerified ? "opacity-50 cursor-not-allowed" : "",
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
