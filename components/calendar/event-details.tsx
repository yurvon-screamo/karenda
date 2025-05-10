"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Trash2, X, Save, GripVertical, Repeat, Pencil, UserPlus, UserMinus } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui"
import { CalendarSyncManager } from "@/components/sync/calendar-sync-manager"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui"
import { Label } from "@/components/ui"
import { DayTasks } from "@/components/calendar/day-tasks"
import { CalendarEvent, Task, ParticipantStatus, ParticipantRole } from "@/lib/types"
import { eventUtils } from "./event-details/utils"
import { SLOT_HEIGHT, WEEKDAYS, MONTH_NAMES } from "./event-details/constants"

interface EventDetailsProps {
  selectedDate: Date
  selectedEvent: CalendarEvent | null
  onClose: () => void
  events: CalendarEvent[]
  tasks: Task[]
  onUpdateEvents: (events: CalendarEvent[]) => void
  onUpdateTasks: (tasks: Task[]) => void
  onUpdateEventTime: (event: CalendarEvent, hour: number, minute: number) => void
  onSyncComplete: (events: CalendarEvent[]) => void
  onDragStart: (event: CalendarEvent | null) => void
  onConvertTaskToEvent: (task: Task, hour: number, minute: number) => void
}

export function EventDetails({
  selectedDate,
  selectedEvent,
  onClose,
  events,
  tasks,
  onUpdateEvents,
  onUpdateTasks,
  onUpdateEventTime,
  onSyncComplete,
  onDragStart,
  onConvertTaskToEvent,
}: EventDetailsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    date: string
    time: string
    timeFormat: 'AM' | 'PM'
    duration: number
    location: string
    isAllDay: boolean
    isRecurring: boolean
    recurrenceType?: 'daily' | 'weekly' | 'weekdays' | 'monthly'
    recurrenceEndDate?: string
    participants: {
      id: string
      name: string
      email: string
      avatar?: string
      status?: ParticipantStatus
      role?: ParticipantRole
      isOrganizer?: boolean
    }[]
  }>({
    title: '',
    description: '',
    date: '',
    time: '',
    timeFormat: 'AM',
    duration: 60,
    location: '',
    isAllDay: false,
    isRecurring: false,
    participants: []
  })
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const { toast } = useToast()
  const [newParticipant, setNewParticipant] = useState({ name: "", email: "" })

  // Загрузка событий из localStorage при инициализации
  useEffect(() => {
    const storedEvents = localStorage.getItem('calendar_events')
    if (storedEvents) {
      try {
        const parsedEvents = JSON.parse(storedEvents)
        if (Array.isArray(parsedEvents)) {
          onUpdateEvents(parsedEvents)
        }
      } catch (error) {
        console.error('Ошибка при загрузке событий из localStorage:', error)
      }
    }
  }, [])

  // Refs для отслеживания перетаскивания
  const dragStartY = useRef<number>(0)
  const draggedEventInitialHour = useRef<number>(0)
  const wasDrag = useRef(false)

  const formattedDate = `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`

  // Получаем события на выбранную дату
  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    )
  })

  // Создаем массив слотов по 15 минут
  const slots = Array.from({ length: 96 }, (_, i) => i)

  // Получаем события, которые начинаются в этот день
  const dayStartEvents = dayEvents.filter(event => {
    const [eventHour] = event.time.split(":").map(Number)
    return eventHour >= 0 && eventHour < 24
  })

  // Обработчики событий
  const handleEventClick = (event: CalendarEvent, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    setCurrentEvent(event)
    const [hours, minutes] = event.time.split(':')
    const timeFormat = parseInt(hours) >= 12 ? 'PM' as const : 'AM' as const
    const newFormData = {
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time,
      timeFormat,
      duration: event.duration || 60,
      location: event.location || '',
      isAllDay: event.isAllDay || false,
      isRecurring: !!event.recurrenceType,
      recurrenceType: event.recurrenceType || 'daily',
      recurrenceEndDate: event.recurrenceEndDate || '',
      participants: event.participants || []
    }
    setFormData(newFormData)
  }

  const handleEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    handleEventClick(event)
    setIsDrawerOpen(true)
  }

  const handleTimeClick = (time: string) => {
    const [hours, minutes] = time.split(':')
    const timeFormat = parseInt(hours) >= 12 ? 'PM' : 'AM'
    const formattedTime = `${hours.padStart(2, '0')}:${minutes}`
    setCurrentEvent(null)
    setFormData({
      title: '',
      description: '',
      date: selectedDate.toISOString().split('T')[0],
      time: formattedTime,
      timeFormat,
      duration: 60,
      location: '',
      isAllDay: false,
      isRecurring: false,
      recurrenceType: 'daily',
      recurrenceEndDate: '',
      participants: []
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleSaveEvent = () => {
    const [hours, minutes] = formData.time.split(":").map(Number)
    const eventDate = new Date(formData.date)
    eventDate.setHours(hours, minutes, 0, 0)

    const newEvent: CalendarEvent = {
      id: currentEvent?.id || Date.now().toString(),
      title: formData.title,
      date: eventDate.toISOString(),
      time: formData.time,
      duration: Number(formData.duration),
      description: formData.description,
      source: currentEvent?.source || "external",
      location: formData.location || "",
      isAllDay: formData.isAllDay || false,
      isGenerated: false,
      ...(formData.isRecurring && {
        recurrenceType: formData.recurrenceType as 'daily' | 'weekly' | 'weekdays' | 'monthly',
        recurrenceEndDate: formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate).toISOString() : undefined,
      }),
      ...(currentEvent && {
        priority: currentEvent.priority,
      }),
      participants: formData.participants
    }

    let updatedEvents: CalendarEvent[]
    if (currentEvent) {
      updatedEvents = events.map(event =>
        event.id === currentEvent.id ? newEvent : event
      )
    } else {
      updatedEvents = [...events, newEvent]
    }

    onUpdateEvents(updatedEvents)
    localStorage.setItem('calendar_events', JSON.stringify(updatedEvents))

    toast({
      title: currentEvent ? "Событие обновлено" : "Событие создано",
      description: `${newEvent.title} ${currentEvent ? "обновлено" : "добавлено"} в календарь`,
    })

    setIsDrawerOpen(false)
    setCurrentEvent(null)
  }

  const handleDeleteEvent = () => {
    if (!currentEvent) return

    const updatedEvents = events.filter(event => event.id !== currentEvent.id)
    onUpdateEvents(updatedEvents)
    localStorage.setItem('calendar_events', JSON.stringify(updatedEvents))

    toast({
      title: "Событие удалено",
      description: `${currentEvent.title} удалено из календаря`,
    })

    setIsDrawerOpen(false)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  // Обработчики drag & drop
  const handleDragStart = (event: CalendarEvent | null, e: React.DragEvent) => {
    e.stopPropagation()
    dragStartY.current = e.clientY
    const [eventHour] = event?.time.split(":").map(Number) || [0]
    draggedEventInitialHour.current = eventHour
    setDraggedEvent(event)
    onDragStart(event)
    e.dataTransfer.setData("text/plain", String(event?.id || ''))
    e.dataTransfer.effectAllowed = "move"
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
  }

  const handleTaskDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
    if (!draggedEvent || dragOverSlot === null) {
      setDraggedEvent(null)
      onDragStart(null)
      setDragOverSlot(null)
      return
    }

    const hour = Math.floor(dragOverSlot / 4)
    const minute = (dragOverSlot % 4) * 15
    onUpdateEventTime(draggedEvent, hour, minute)

    toast({
      title: "Событие перемещено",
      description: `Событие "${draggedEvent.title}" перемещено на ${eventUtils.formatHour(hour)}:${minute.toString().padStart(2, "0")}`,
    })

    setDraggedEvent(null)
    onDragStart(null)
    setDragOverSlot(null)
    setDraggedTask(null)
  }

  const CurrentTimeIndicator = () => {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
      const updateTime = () => {
        setCurrentTime(new Date());
      };

      updateTime();
      const interval = setInterval(updateTime, 60000);

      return () => clearInterval(interval);
    }, []);

    if (!currentTime) return null;

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const top = totalMinutes * SLOT_HEIGHT;

    return (
      <div
        className="absolute left-0 right-0 pointer-events-none z-20"
        style={{ top: `${top}px` }}
      >
        <div className="flex items-center">
          <div className="w-16 flex justify-end pr-2">
            <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}
            </div>
          </div>
          <div className="flex-1 h-px bg-red-500" />
        </div>
      </div>
    );
  };

  const handleAddParticipant = () => {
    if (newParticipant.name && newParticipant.email) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          ...newParticipant,
          id: newParticipant.name
        }]
      }))
      setNewParticipant({ name: "", email: "" })
    }
  }

  const handleRemoveParticipant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== id)
    }))
  }

  const getStatusColor = (status?: ParticipantStatus) => {
    switch (status) {
      case ParticipantStatus.ACCEPTED:
        return 'bg-green-500/20 text-green-400'
      case ParticipantStatus.DECLINED:
        return 'bg-red-500/20 text-red-400'
      case ParticipantStatus.TENTATIVE:
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-blue-500/20 text-blue-400'
    }
  }

  const getStatusText = (status?: ParticipantStatus) => {
    switch (status) {
      case ParticipantStatus.ACCEPTED:
        return 'Принял'
      case ParticipantStatus.DECLINED:
        return 'Отклонил'
      case ParticipantStatus.TENTATIVE:
        return 'Возможно'
      default:
        return 'Ожидает ответа'
    }
  }

  // Добавляем эффект для отслеживания изменений formData
  useEffect(() => {
    if (formData.participants) {
      const uniqueParticipants = formData.participants.filter((participant, index, self) =>
        index === self.findIndex(p => p.name === participant.name)
      );
    }
  }, [formData]);

  // Добавляем эффект для отслеживания изменений currentEvent
  useEffect(() => {
  }, [currentEvent]);

  return (
    <div className="w-full md:w-2/3 flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between pt-6 pb-4 px-6 border-b border-primary/20">
        <div className="flex-1 flex items-center gap-3">
          <img src="/karenda.png" alt="Karenda logo" style={{ height: '80px', width: '80px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="text-6xl font-light leading-none">{selectedDate.getDate()}</div>
          <div className="text-xl mt-1">{WEEKDAYS[selectedDate.getDay()]}</div>
        </div>
        <div className="flex-1 flex justify-end">
          <CalendarSyncManager onSyncComplete={onSyncComplete} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
        <DayTasks
          selectedDate={selectedDate}
          tasks={tasks}
          onUpdateTasks={onUpdateTasks}
          onTaskDragStart={handleTaskDragStart}
        />

        <div className="flex" style={{ height: `${24 * 60 * SLOT_HEIGHT}px` }}>
          {/* Левая колонка — время */}
          <div className="w-16 relative select-none text-white/80" style={{ height: `${24 * 60 * SLOT_HEIGHT}px` }}>
            {slots.map((slot) => {
              const hour = Math.floor(slot / 4)
              const minute = (slot % 4) * 15
              if (minute !== 0) return null
              return (
                <div
                  key={slot}
                  style={{
                    position: 'absolute',
                    top: `${slot * 15 * SLOT_HEIGHT}px`,
                    height: `${60 * SLOT_HEIGHT}px`,
                    lineHeight: `${60 * SLOT_HEIGHT}px`,
                    width: '100%',
                    textAlign: 'right',
                    paddingRight: '8px',
                    fontSize: '0.75rem',
                  }}
                >
                  {eventUtils.formatHour(hour)}
                </div>
              )
            })}
          </div>

          {/* Правая колонка — слоты и события */}
          <div
            className="flex-1 relative"
            onDragOver={e => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const y = e.clientY - rect.top

              const scrollContainer = e.currentTarget.parentElement
              if (scrollContainer) {
                const scrollThreshold = 100
                const scrollSpeed = 10

                if (rect.bottom - e.clientY < scrollThreshold) {
                  scrollContainer.scrollTop += scrollSpeed
                }
                if (e.clientY - rect.top < scrollThreshold) {
                  scrollContainer.scrollTop -= scrollSpeed
                }
              }

              const slot = Math.round(y / (15 * SLOT_HEIGHT))
              setDragOverSlot(slot)
            }}
            onDrop={e => {
              e.preventDefault()
              if (draggedEvent && dragOverSlot !== null) {
                const slotMinutes = dragOverSlot * 15
                const hour = Math.floor(slotMinutes / 60)
                const minute = slotMinutes % 60
                onUpdateEventTime(draggedEvent, hour, minute)

                // Обновляем события в localStorage
                const updatedEvents = events.map(event =>
                  event.id === draggedEvent.id
                    ? { ...event, time: `${hour.toString().padStart(2, "0")}: ${minute.toString().padStart(2, "0")}` }
                    : event
                )
                localStorage.setItem('calendar_events', JSON.stringify(updatedEvents))

                toast({
                  title: "Событие перемещено",
                  description: `Событие "${draggedEvent.title}" перемещено на ${hour.toString().padStart(2, "0")}: ${minute.toString().padStart(2, "0")}`,
                })

                setDraggedEvent(null)
                setDragOverSlot(null)
                onDragStart(null)
              } else if (draggedTask && dragOverSlot !== null) {
                const slotMinutes = dragOverSlot * 15
                const hour = Math.floor(slotMinutes / 60)
                const minute = slotMinutes % 60
                onConvertTaskToEvent(draggedTask, hour, minute)

                setDraggedTask(null)
                setDragOverSlot(null)
                setDraggedEvent(null)
                onDragStart(null)
              }
            }}
            onDragLeave={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX
              const y = e.clientY
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setDragOverSlot(null)
              }
            }}
            style={{ height: `${24 * 60 * SLOT_HEIGHT}px` }}
          >
            <CurrentTimeIndicator />

            {eventUtils.groupEventsByTime(dayStartEvents).map((events, groupIndex) =>
              events.map((event) => {
                const { top, height, width, left } = eventUtils.getEventPosition(event, events)
                const now = new Date()
                const eventDateTime = new Date(event.date)
                eventDateTime.setHours(parseInt(event.time.split(':')[0]), parseInt(event.time.split(':')[1]), 0, 0)
                const isPastEvent = eventDateTime < now

                return (
                  <div
                    key={event.id}
                    data-event-id={event.id}
                    className={cn(
                      "absolute text-left px-1.5 py-0.5 rounded transition-all mb-0.5 group shadow-lg",
                      "bg-primary/10 hover:bg-primary/15",
                      event.source === "outlook" && "border-l-4 border-blue-500",
                      event.source === "external" && "border-l-4 border-purple-500",
                      event.recurrenceType && "border-r-4 border-r-primary/50",
                      isPastEvent && "opacity-50 grayscale hover:opacity-70",
                      "cursor-grab active:cursor-grabbing"
                    )}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      width: width,
                      left: left,
                      pointerEvents: 'auto',
                      zIndex: 10
                    }}
                    onClick={(e: React.MouseEvent) => handleEventClick(event)}
                    draggable={true}
                    onDragStart={(e: React.DragEvent) => handleDragStart(event, e)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center h-full overflow-hidden">
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium flex items-center gap-1 truncate text-sm",
                          height < 30 && "text-xs",
                          isPastEvent && "line-through text-white/50"
                        )}>
                          {event.title}
                          {event.recurrenceType && <Repeat className="h-3 w-3 text-primary/70 inline-block ml-1 flex-shrink-0" />}
                        </div>
                        {height >= 30 && (
                          <>
                            <div className={cn(
                              "text-xs text-white/70 truncate",
                              isPastEvent && "text-white/40"
                            )}>
                              {eventUtils.formatTimeWithAmPm(event.time)} - {eventUtils.formatDuration(event.duration || 60)}
                            </div>
                          </>
                        )}
                      </div>
                      <div
                        className={cn(
                          "opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity flex-shrink-0",
                          isPastEvent && "opacity-30"
                        )}
                        title="Редактировать"
                        onClick={(e: React.MouseEvent) => handleEditEvent(event, e)}
                      >
                        <Pencil className="h-3 w-3 text-white/60 hover:text-white/80" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Слоты 15 минут */}
            {slots.map((slot) => {
              const hour = Math.floor(slot / 4)
              const minute = (slot % 4) * 15
              const isDropTarget = dragOverSlot === slot
              const isTaskDropTarget = draggedTask && dragOverSlot === slot
              const isHourLine = minute === 0

              return (
                <div
                  key={slot}
                  className={cn(
                    "border-l-2 pr-2 transition-colors relative cursor-pointer group",
                    "bg-transparent hover:bg-primary/10",
                    "border-primary/20",
                    isDropTarget && "bg-primary/20 border-primary z-10",
                    isTaskDropTarget && "bg-green-500/20 border-green-500 z-10",
                    isHourLine && "border-t border-primary/30"
                  )}
                  style={{ minHeight: `${15 * SLOT_HEIGHT}px`, height: `${15 * SLOT_HEIGHT}px` }}
                  onClick={() => handleTimeClick(`${hour}: ${minute}`)}
                >
                  <div className="flex-1"></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <span className="text-xs text-white px-2 rounded-sm">
                      Создать событие
                    </span>
                  </div>
                  {isTaskDropTarget && (
                    <div className="w-full text-left px-3 py-1.5 rounded transition-all mb-1 bg-green-500/20 border border-green-500/50 border-dashed absolute left-0 right-0 top-0 z-20">
                      <div className="font-medium text-green-400">Перетащите сюда для создания события</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Дровер для просмотра и редактирования события */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              {currentEvent ? (
                <DrawerTitle>Событие</DrawerTitle>
              ) : (
                <DrawerTitle>Новое событие</DrawerTitle>
              )}
              <DrawerClose onClick={handleCloseDrawer} />
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
                  onChange={handleInputChange}
                  placeholder="Название события"
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium text-white/70">
                  Дата
                </label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    className="bg-secondary/50 border-primary/20 text-white flex-1"
                  />
                  <Select
                    value={formData.timeFormat}
                    onValueChange={(value) => handleSelectChange("timeFormat", value)}
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

              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium text-white/70">
                  Длительность
                </label>
                <Select value={formData.duration.toString()} onValueChange={(value) => handleSelectChange("duration", Number(value))} >
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
                    onCheckedChange={(checked) => handleSwitchChange("isRecurring", checked)}
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
                        onValueChange={(value) => handleSelectChange("recurrenceType", value)}
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
                        onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  placeholder="Описание события"
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40 min-h-[200px]"
                />
              </div>

              {/* Секция участников */}
              <div className="space-y-4 mt-4">
                <h3 className="text-lg font-medium">Участники</h3>
                <div className="space-y-2">
                  {formData.participants && formData.participants.length > 0 ? (
                    formData.participants
                      .filter((participant, index, self) =>
                        index === self.findIndex(p => p.name === participant.name)
                      )
                      .map(participant => (
                        <div key={participant.name} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                          <div className="flex items-center space-x-2">
                            {participant.avatar ? (
                              <img src={participant.avatar} alt={participant.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                {participant.name[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{participant.name}</p>
                              <p className="text-sm text-white/50">{participant.email}</p>
                              {participant.status && (
                                <p className={cn(
                                  "text-xs mt-1 px-2 py-0.5 rounded-full inline-block",
                                  getStatusColor(participant.status)
                                )}>
                                  {getStatusText(participant.status)}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveParticipant(participant.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                  ) : (
                    <p className="text-white/50">Нет участников</p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Input
                    placeholder="Имя участника"
                    value={newParticipant.name}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                  <Input
                    placeholder="Email участника"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40"
                  />
                  <Button onClick={handleAddParticipant}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
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
                  onClick={handleDeleteEvent}
                  title="Удалить"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Удалить</span>
                </Button>
              )}
              <Button
                size="icon"
                className="h-12 w-12"
                onClick={handleSaveEvent}
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
    </div>
  )
}
