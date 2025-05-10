import { CalendarEvent } from "@/lib/types"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { Switch } from "@/components/ui"
import { Label } from "@/components/ui"
import { Trash2, Save } from "lucide-react"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerBody,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui"

interface EventDrawerProps {
    isOpen: boolean
    onClose: () => void
    currentEvent: CalendarEvent | null
    formData: {
        title: string
        date: string
        time: string
        timeFormat: string
        duration: string
        description: string
        isRecurring: boolean
        recurrenceType: string
        recurrenceEndDate: string
    }
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    onSelectChange: (name: string, value: string) => void
    onSwitchChange: (name: string, checked: boolean) => void
    onSave: () => void
    onDelete: () => void
}

export function EventDrawer({
    isOpen,
    onClose,
    currentEvent,
    formData,
    onInputChange,
    onSelectChange,
    onSwitchChange,
    onSave,
    onDelete,
}: EventDrawerProps) {
    return (
        <Drawer open={isOpen} onOpenChange={onClose} direction="right">
            <DrawerContent>
                <DrawerHeader>
                    <div className="flex items-center justify-between">
                        {currentEvent ? (
                            <DrawerTitle>Событие</DrawerTitle>
                        ) : (
                            <DrawerTitle>Новое событие</DrawerTitle>
                        )}
                        <DrawerClose onClick={onClose} />
                    </div>
                </DrawerHeader>

                <DrawerBody>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="title" className="text-sm font-medium text-white/70">
                                Название
                            </label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={onInputChange}
                                placeholder="Название события"
                                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="date" className="text-sm font-medium text-white/70">
                                    Дата
                                </label>
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={onInputChange}
                                    className="bg-secondary/50 border-primary/20 text-white"
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
                                        value={formData.time}
                                        onChange={onInputChange}
                                        className="bg-secondary/50 border-primary/20 text-white flex-1"
                                    />
                                    <Select
                                        value={formData.timeFormat}
                                        onValueChange={(value) => onSelectChange("timeFormat", value)}
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
                            <Select value={formData.duration} onValueChange={(value) => onSelectChange("duration", value)}>
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
                                    checked={formData.isRecurring}
                                    onCheckedChange={(checked) => onSwitchChange("isRecurring", checked)}
                                />
                            </div>

                            {formData.isRecurring && (
                                <div className="space-y-4 mt-4 pl-2 border-l-2 border-primary/20">
                                    <div className="space-y-2">
                                        <label htmlFor="recurrenceType" className="text-sm font-medium text-white/70">
                                            Тип повторения
                                        </label>
                                        <Select
                                            value={formData.recurrenceType}
                                            onValueChange={(value) => onSelectChange("recurrenceType", value)}
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
                                            value={formData.recurrenceEndDate}
                                            onChange={onInputChange}
                                            className="bg-secondary/50 border-primary/20 text-white"
                                        />
                                        <p className="text-xs text-white/50">Оставьте пустым для бессрочного повторения</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium text-white/70">
                                Описание
                            </label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={onInputChange}
                                placeholder="Описание события"
                                className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40 min-h-[200px]"
                            />
                        </div>
                    </div>
                </DrawerBody>

                <DrawerFooter>
                    <div className="flex justify-center gap-4">
                        {currentEvent && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 border-primary/20 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                                onClick={onDelete}
                                title="Удалить"
                            >
                                <Trash2 className="h-5 w-5" />
                                <span className="sr-only">Удалить</span>
                            </Button>
                        )}
                        <Button
                            size="icon"
                            className="h-12 w-12"
                            onClick={onSave}
                            title="Сохранить"
                            disabled={!formData.title.trim()}
                        >
                            <Save className="h-5 w-5" />
                            <span className="sr-only">Сохранить</span>
                        </Button>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
} 