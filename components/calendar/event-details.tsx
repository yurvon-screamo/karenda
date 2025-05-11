"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Trash2, X, Save, GripVertical, Repeat, Pencil, UserPlus, UserMinus, Lock, FileText } from "lucide-react"
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
import { EventTimeSettings } from "./event-details/EventTimeSettings"

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
      description: event.description.trim() || '',
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
    setIsDrawerOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Проверяем, является ли событие синхронизированным
    if (currentEvent && (currentEvent.source === 'outlook' || currentEvent.source === 'caldav')) {
      toast({
        title: "Невозможно редактировать",
        description: "Синхронизированные события нельзя редактировать",
        variant: "destructive",
      })
      return
    }

    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (field: string, value: string | number | boolean) => {
    // Проверяем, является ли событие синхронизированным
    if (currentEvent && (currentEvent.source === 'outlook' || currentEvent.source === 'caldav')) {
      toast({
        title: "Невозможно редактировать",
        description: "Синхронизированные события нельзя редактировать",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    // Проверяем, является ли событие синхронизированным
    if (currentEvent && (currentEvent.source === 'outlook' || currentEvent.source === 'caldav')) {
      toast({
        title: "Невозможно редактировать",
        description: "Синхронизированные события нельзя редактировать",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleSaveEvent = () => {
    // Проверяем, является ли событие синхронизированным
    if (currentEvent && (currentEvent.source === 'outlook' || currentEvent.source === 'caldav')) {
      toast({
        title: "Невозможно сохранить",
        description: "Синхронизированные события нельзя редактировать",
        variant: "destructive",
      })
      return
    }

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
      source: currentEvent?.source || "default",
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

    // Проверяем, является ли событие синхронизированным
    if (currentEvent.source === 'outlook' || currentEvent.source === 'caldav') {
      toast({
        title: "Невозможно удалить",
        description: "Синхронизированные события нельзя удалять",
        variant: "destructive",
      })
      return
    }

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
    console.log('Drag start:', event)
    if (!event) return

    // Проверяем, можно ли перетаскивать событие
    if (event.source === 'outlook' || event.source === 'caldav') {
      e.preventDefault()
      toast({
        title: "Невозможно переместить",
        description: "Синхронизированные события нельзя перемещать",
        variant: "destructive",
      })
      return
    }

    e.stopPropagation()
    e.dataTransfer.setData("text/plain", event.id.toString())
    e.dataTransfer.effectAllowed = "move"

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }

    setDraggedEvent(event)
    onDragStart(event)
  }

  const handleTaskDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('Drag end')
    e.stopPropagation()

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }

    setDraggedEvent(null)
    onDragStart(null)
    setDragOverSlot(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top

    // Автопрокрутка при перетаскивании
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
    console.log('Drag over slot:', slot)
    setDragOverSlot(slot)
  }

  const handleDrop = async (e: React.DragEvent) => {
    console.log('Drop event:', { draggedEvent, draggedTask, dragOverSlot })
    e.preventDefault()

    if (draggedTask && dragOverSlot !== null) {
      const slotMinutes = dragOverSlot * 15
      const hour = Math.floor(slotMinutes / 60)
      const minute = slotMinutes % 60
      onConvertTaskToEvent(draggedTask, hour, minute)
      setDraggedTask(null)
      setDragOverSlot(null)
      toast({
        title: "Задача преобразована в событие",
        description: `Задача "${draggedTask.title}" запланирована на ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      })
      return
    }

    if (!draggedEvent || dragOverSlot === null) {
      console.log('No dragged event or slot')
      return
    }

    const slotMinutes = dragOverSlot * 15
    const hour = Math.floor(slotMinutes / 60)
    const minute = slotMinutes % 60

    console.log('Calculated time:', { hour, minute })

    try {
      await onUpdateEventTime(draggedEvent, hour, minute)

      toast({
        title: "Событие перемещено",
        description: `Событие "${draggedEvent.title}" перемещено на ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      })
    } catch (error) {
      console.error('Ошибка при перемещении события:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось переместить событие",
        variant: "destructive",
      })
    } finally {
      setDraggedEvent(null)
      onDragStart(null)
      setDragOverSlot(null)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    console.log('Drag leave')
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSlot(null)
    }
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
    // Проверяем, является ли событие синхронизированным
    if (currentEvent && (currentEvent.source === 'outlook' || currentEvent.source === 'caldav')) {
      toast({
        title: "Невозможно редактировать",
        description: "Синхронизированные события нельзя редактировать",
        variant: "destructive",
      })
      return
    }

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
    // Проверяем, является ли событие синхронизированным
    if (currentEvent && (currentEvent.source === 'outlook' || currentEvent.source === 'caldav')) {
      toast({
        title: "Невозможно редактировать",
        description: "Синхронизированные события нельзя редактировать",
        variant: "destructive",
      })
      return
    }

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

  // Авто-рост textarea для описания
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [formData.description]);

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
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
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
                      event.source === "caldav" && "border-l-4 border-purple-500",
                      event.recurrenceType && "border-r-4 border-r-primary/50",
                      isPastEvent && "opacity-50 grayscale hover:opacity-70",
                      (event.source === "outlook" || event.source === "caldav")
                        ? "cursor-not-allowed"
                        : "cursor-grab active:cursor-grabbing"
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
                    draggable={!(event.source === "outlook" || event.source === "caldav")}
                    onDragStart={(e: React.DragEvent) => handleDragStart(event, e)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center h-full overflow-hidden">
                      <div
                        className={cn(
                          "opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity flex-shrink-0 mr-5",
                          isPastEvent && "opacity-30"
                        )}
                        title="Просмотр"
                        onClick={(e: React.MouseEvent) => handleEditEvent(event, e)}
                      >
                        <FileText className="h-4 w-4 text-white/60 hover:text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "font-medium truncate text-sm",
                            height < 30 && "text-xs",
                            isPastEvent && "line-through text-white/50"
                          )}>
                            {event.title}
                          </div>
                          {event.recurrenceType && <Repeat className="h-3 w-3 text-primary/70 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className={cn(
                            "text-xs text-white/70 truncate",
                            isPastEvent && "text-white/40"
                          )}>
                            {eventUtils.formatTimeWithAmPm(event.time)} - {eventUtils.formatDuration(event.duration || 60)}
                          </div>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            event.source === "outlook" && "bg-blue-500/20 text-blue-400",
                            event.source === "caldav" && "bg-purple-500/20 text-purple-400",
                            event.source === "task" && "bg-green-500/20 text-green-400",
                            !event.source && "bg-primary/20 text-primary/70"
                          )}>
                            {event.source === "outlook" && "Outlook"}
                            {event.source === "caldav" && "CalDAV"}
                            {event.source === "task" && "Задача"}
                            {!event.source && "Локальное"}
                          </span>
                        </div>
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
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right" width="w-[1000px]">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {currentEvent ? (
                  <>
                    <DrawerTitle>Событие</DrawerTitle>
                    {(currentEvent.source === "outlook" || currentEvent.source === "caldav") && (
                      <div className="flex items-center gap-1 text-sm text-white/50">
                        <Lock className="h-4 w-4" />
                        <span>Только для чтения</span>
                      </div>
                    )}
                  </>
                ) : (
                  <DrawerTitle>Новое событие</DrawerTitle>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                {currentEvent && currentEvent.source !== "outlook" && currentEvent.source !== "caldav" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/10"
                      onClick={handleDeleteEvent}
                      title="Удалить"
                    >
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleSaveEvent}
                      title="Сохранить"
                      disabled={!formData.title.trim()}
                    >
                      <Save className="h-5 w-5" />
                    </Button>
                  </>
                )}
                <DrawerClose className="h-8 w-8" onClick={handleCloseDrawer} />
              </div>
            </div>
          </DrawerHeader>

          <DrawerBody className="custom-scrollbar">
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
                  readOnly={currentEvent?.source === "outlook" || currentEvent?.source === "caldav"}
                />
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
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40 resize-none overflow-hidden"
                  ref={textareaRef}
                  style={{ minHeight: '40px', maxHeight: 'none' }}
                  rows={1}
                  readOnly={currentEvent?.source === "outlook" || currentEvent?.source === "caldav"}
                />
              </div>

              <EventTimeSettings
                date={formData.date}
                time={formData.time}
                timeFormat={formData.timeFormat}
                duration={formData.duration.toString()}
                isRecurring={formData.isRecurring}
                recurrenceType={formData.recurrenceType ? formData.recurrenceType : ""}
                recurrenceEndDate={formData.recurrenceEndDate ? formData.recurrenceEndDate : ""}
                onInputChange={handleInputChange}
                onSelectChange={handleSelectChange}
                onSwitchChange={handleSwitchChange}
                isReadOnly={currentEvent?.source === "outlook" || currentEvent?.source === "caldav"}
              />

              {/* Секция участников */}
              <div className="space-y-2 mt-2">
                <h3 className="text-base font-medium">Участники</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {formData.participants && formData.participants.length > 0 ? (
                    <>
                      {formData.participants
                        .filter((participant, index, self) =>
                          index === self.findIndex(p => p.name === participant.name)
                        )
                        .map(participant => (
                          <div key={participant.name} className="bg-secondary/40 hover:bg-secondary/60 transition-colors rounded-lg p-2 relative group flex flex-col items-center text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-900/30 hover:bg-red-900/50"
                              onClick={() => handleRemoveParticipant(participant.id)}
                            >
                              <UserMinus className="h-3 w-3 text-red-300" />
                            </Button>
                            {participant.avatar ? (
                              <img
                                src={participant.avatar}
                                alt={participant.name}
                                className="w-8 h-8 rounded-full border border-primary/20 mb-1"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-base font-semibold mb-1 border border-primary/10">
                                {participant.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <p className="font-medium text-xs truncate max-w-full leading-tight">{participant.name}</p>
                            <p className="text-[10px] text-white/50 truncate max-w-full mb-1 leading-tight">{participant.email}</p>
                            {participant.status && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full",
                                getStatusColor(participant.status)
                              )}>
                                {getStatusText(participant.status)}
                              </span>
                            )}
                            {participant.role && (
                              <span className="text-[10px] text-white/50 mt-0.5">
                                {participant.role === ParticipantRole.CHAIR ? "Организатор" :
                                  participant.role === ParticipantRole.REQ_PARTICIPANT ? "Обязательный" : "Необязательный"}
                              </span>
                            )}
                          </div>
                        ))}
                      {/* Карточка для добавления нового участника */}
                      <div className="bg-secondary/30 border-2 border-dashed border-primary/20 rounded-lg p-2 flex flex-col items-center justify-center text-center min-h-[110px]">
                        <Input
                          placeholder="Имя участника"
                          value={newParticipant.name}
                          onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40 mb-1 text-xs px-2 py-1 h-7"
                        />
                        <Input
                          placeholder="Email участника"
                          value={newParticipant.email}
                          onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40 mb-2 text-xs px-2 py-1 h-7"
                        />
                        <Button onClick={handleAddParticipant} variant="outline" className="h-7 text-xs w-full flex items-center justify-center gap-1 border-primary/30 hover:bg-primary/10 transition-colors">
                          <UserPlus className="h-4 w-4" />
                          <span>Добавить</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-full text-center p-4 border border-dashed border-primary/20 rounded-lg">
                      <p className="text-white/50">Нет участников</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
