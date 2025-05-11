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
import { CalendarEvent, CalendarSource } from "@/lib/types"

const SYNC_INTERVAL = 2 // minutes

interface EWSFormData {
    name: string
    email: string
    password: string
    serverUrl?: string
}

interface OutlookSyncDialogProps {
    onSyncComplete: (events: CalendarEvent[]) => void
    onSettingsSave?: (source: CalendarSource) => void
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

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
        name: "",
        email: "",
        password: "",
        serverUrl: "",
    })
    const { toast } = useToast()

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
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
            const response = await fetch("/api/outlook-test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    serverUrl: formData.serverUrl,
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

            setIsConnectionVerified(true)
            setFormData(prev => ({ ...prev }))

            toast({
                title: "Подключение успешно",
                description: "Можно сохранить настройки",
            })
        } catch (error) {
            console.error("Ошибка при проверке подключения:", error)
            setIsConnectionVerified(false)
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
        if (!formData.name || !formData.email || !formData.password) {
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
            protocol: 'ews',
            autoSync: true,
            syncInterval: SYNC_INTERVAL,
            ews: {
                email: formData.email,
                password: formData.password,
                serverUrl: formData.serverUrl,
            }
        }

        if (onSettingsSave) {
            onSettingsSave(source)
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
            const source: CalendarSource = {
                id: "", // Will be set by the parent component
                name: formData.name,
                protocol: 'ews',
                autoSync: true,
                syncInterval: SYNC_INTERVAL,
                ews: {
                    email: formData.email,
                    password: formData.password,
                    serverUrl: formData.serverUrl
                }
            }

            if (onSettingsSave) {
                onSettingsSave(source)
            }

            const now = new Date()
            const startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            const endDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())

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
                            <DrawerTitle>Настройки Outlook</DrawerTitle>
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
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
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

                        <div className="space-y-2">
                            <Label htmlFor="serverUrl">URL сервера (опционально)</Label>
                            <Input
                                id="serverUrl"
                                name="serverUrl"
                                value={formData.serverUrl}
                                onChange={handleInputChange}
                                placeholder="https://outlook.office365.com/EWS/Exchange.asmx"
                            />
                        </div>
                    </div>
                </DrawerBody>

                <DrawerFooter>
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={isLoading || !formData.email || !formData.password}
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
                                disabled={isLoading || !isConnectionVerified}
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
