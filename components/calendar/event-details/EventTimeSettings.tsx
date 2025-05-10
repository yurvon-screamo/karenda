import React from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Clock, TimerIcon, RefreshCw, Calendar } from "lucide-react"

interface EventTimeSettingsProps {
    date: string
    time: string
    timeFormat: 'AM' | 'PM'
    duration: string
    isRecurring: boolean
    recurrenceType: string
    recurrenceEndDate: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    onSelectChange: (name: string, value: string) => void
    onSwitchChange: (name: string, checked: boolean) => void
    isReadOnly?: boolean
}

export function EventTimeSettings({
    date,
    time,
    timeFormat,
    duration,
    isRecurring,
    recurrenceType,
    recurrenceEndDate,
    onInputChange,
    onSelectChange,
    onSwitchChange,
    isReadOnly = false
}: EventTimeSettingsProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="date" className="text-sm font-medium text-white/70">
                        Дата
                    </label>
                    <Input
                        id="date"
                        name="date"
                        type="date"
                        value={date}
                        onChange={onInputChange}
                        className="bg-secondary/50 border-primary/20 text-white"
                        readOnly={isReadOnly}
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="time" className="text-sm font-medium text-white/70">
                        Время
                    </label>
                    <div className="flex gap-2">
                        <Input
                            id="time"
                            name="time"
                            type="time"
                            value={time}
                            onChange={onInputChange}
                            className="bg-secondary/50 border-primary/20 text-white flex-1"
                            readOnly={isReadOnly}
                        />
                        <Select
                            value={timeFormat}
                            onValueChange={(value) => onSelectChange("timeFormat", value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger className="w-20 bg-secondary/50 border-primary/20 text-white">
                                <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium text-white/70">
                    Длительность
                </label>
                <Select
                    value={duration}
                    onValueChange={(value) => onSelectChange("duration", value)}
                    disabled={isReadOnly}
                >
                    <SelectTrigger className="w-full bg-secondary/50 border-primary/20 text-white">
                        <SelectValue placeholder="Выберите длительность" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                        <SelectItem value="15">15 минут</SelectItem>
                        <SelectItem value="30">30 минут</SelectItem>
                        <SelectItem value="45">45 минут</SelectItem>
                        <SelectItem value="60">1 час</SelectItem>
                        <SelectItem value="90">1.5 часа</SelectItem>
                        <SelectItem value="120">2 часа</SelectItem>
                        <SelectItem value="180">3 часа</SelectItem>
                        <SelectItem value="240">4 часа</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Настройки повторения */}
            <div className="pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="isRecurring" className="text-white/70">
                            Повторяющееся событие
                        </Label>
                        <p className="text-xs text-white/50">Настройте регулярное повторение события</p>
                    </div>
                    <Switch
                        id="isRecurring"
                        checked={isRecurring}
                        onCheckedChange={(checked) => onSwitchChange("isRecurring", checked)}
                        disabled={isReadOnly}
                    />
                </div>

                {isRecurring && (
                    <div className="space-y-4 mt-4 pl-2 border-l-2 border-primary/20">
                        <div className="space-y-2">
                            <label htmlFor="recurrenceType" className="text-sm font-medium text-white/70">
                                Тип повторения
                            </label>
                            <Select
                                value={recurrenceType}
                                onValueChange={(value) => onSelectChange("recurrenceType", value)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full bg-secondary/50 border-primary/20 text-white">
                                    <SelectValue placeholder="Выберите тип повторения" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                                    <SelectItem value="daily">Ежедневно</SelectItem>
                                    <SelectItem value="weekly">Еженедельно</SelectItem>
                                    <SelectItem value="weekdays">По рабочим дням</SelectItem>
                                    <SelectItem value="monthly">Ежемесячно</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="recurrenceEndDate" className="text-sm font-medium text-white/70">
                                Дата окончания (необязательно)
                            </label>
                            <Input
                                id="recurrenceEndDate"
                                name="recurrenceEndDate"
                                type="date"
                                value={recurrenceEndDate}
                                onChange={onInputChange}
                                className="bg-secondary/50 border-primary/20 text-white"
                                readOnly={isReadOnly}
                            />
                            <p className="text-xs text-white/50">Оставьте пустым для бессрочного повторения</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 