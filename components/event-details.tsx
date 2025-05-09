"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Trash2, X, Save, GripVertical, Repeat, Pencil } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerClose,
} from "./drawer"
import { CalendarSyncManager } from "./calendar-sync-manager"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "./switch"
import { Label } from "./label"
import { DayTasks } from "./day-tasks"
import { CalendarEvent } from "@/lib/types"

const SLOT_HEIGHT = 0.75 // px за минуту
const EMPTY_SLOT_HEIGHT = 12 // px

interface EventDetailsProps {
  selectedDate: Date
  selectedEvent: CalendarEvent | null
  onClose: () => void
  events: CalendarEvent[]
  tasks: any[]
  onUpdateEvents: (events: CalendarEvent[]) => void
  onUpdateTasks: (tasks: any[]) => void
  onUpdateEventTime: (event: CalendarEvent, hour: number, minute: number) => void
  onSyncComplete: (events: any[]) => void
  onDragStart: (event: CalendarEvent | null) => void
  onConvertTaskToEvent: (task: any, hour: number, minute: number) => void
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
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    timeFormat: "AM", // AM или PM
    duration: "60", // в минутах
    description: "",
    isRecurring: false,
    recurrenceType: "daily", // daily, weekly, weekdays, monthly
    recurrenceEndDate: "",
  })
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [draggedTask, setDraggedTask] = useState<any>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const { toast } = useToast()

  // Ref для отслеживания начальной позиции перетаскивания
  const dragStartY = useRef<number>(0)
  const draggedEventInitialHour = useRef<number>(0)

  // Флаг для отслеживания drag vs click
  const wasDrag = useRef(false)

  const weekdays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
  const monthNames = [
    "Января",
    "Февраля",
    "Марта",
    "Апреля",
    "Мая",
    "Июня",
    "Июля",
    "Августа",
    "Сентября",
    "Октября",
    "Ноября",
    "Декабря",
  ]

  const formattedDate = `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`

  // Получаем события на выбранную дату
  const dayEvents = events.filter((event) => {
    const eventDate = new Date(event.date)
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    )
  })

  // Создаем массив слотов по 15 минут (96 слотов в сутки)
  const slots = Array.from({ length: 96 }, (_, i) => i)

  // Получаем события, которые начинаются в этот день
  const dayStartEvents = dayEvents.filter(event => {
    const [eventHour] = event.time.split(":").map(Number)
    return eventHour >= 0 && eventHour < 24
  })

  // Группируем события по времени начала и перекрытиям
  const groupEventsByTime = (events: CalendarEvent[]) => {
    // Сортируем события по времени начала
    const sortedEvents = [...events].sort((a, b) => {
      const [aHour, aMinute] = a.time.split(":").map(Number)
      const [bHour, bMinute] = b.time.split(":").map(Number)
      return (aHour * 60 + aMinute) - (bHour * 60 + bMinute)
    })

    const groups: CalendarEvent[][] = []
    let currentGroup: CalendarEvent[] = []

    sortedEvents.forEach(event => {
      const [eventHour, eventMinute] = event.time.split(":").map(Number)
      const eventStartMinutes = eventHour * 60 + eventMinute
      const eventEndMinutes = eventStartMinutes + (event.duration || 60)

      // Проверяем, перекрывается ли событие с текущей группой
      const overlapsWithGroup = currentGroup.some(groupEvent => {
        const [groupHour, groupMinute] = groupEvent.time.split(":").map(Number)
        const groupStartMinutes = groupHour * 60 + groupMinute
        const groupEndMinutes = groupStartMinutes + (groupEvent.duration || 60)

        return (
          (eventStartMinutes >= groupStartMinutes && eventStartMinutes < groupEndMinutes) ||
          (eventEndMinutes > groupStartMinutes && eventEndMinutes <= groupEndMinutes) ||
          (eventStartMinutes <= groupStartMinutes && eventEndMinutes >= groupEndMinutes)
        )
      })

      if (overlapsWithGroup) {
        currentGroup.push(event)
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [event]
      }
    })

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
  }

  // Вычисляем позицию события в группе
  const getEventPosition = (event: CalendarEvent, group: CalendarEvent[]) => {
    const [eventHour, eventMinute] = event.time.split(":").map(Number)
    const duration = event.duration || 60
    const top = eventHour * 60 * SLOT_HEIGHT + eventMinute * SLOT_HEIGHT
    const height = duration * SLOT_HEIGHT

    // Находим индекс события в группе
    const index = group.findIndex(e => e.id === event.id)
    const totalEvents = group.length

    // Вычисляем ширину и отступ слева для события
    const width = `${100 / totalEvents}%`
    const left = `${(index * 100) / totalEvents}%`

    return { top, height, width, left }
  }

  // Форматируем час в формате "00:00"
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`
  }

  // Форматируем время в 12-часовом формате с AM/PM
  const formatTimeWithAmPm = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)

    if (hours === 0) {
      return `12:${minutes.toString().padStart(2, "0")} AM`
    } else if (hours < 12) {
      return `${hours}:${minutes.toString().padStart(2, "0")} AM`
    } else if (hours === 12) {
      return `12:${minutes.toString().padStart(2, "0")} PM`
    } else {
      return `${hours - 12}:${minutes.toString().padStart(2, "0")} PM`
    }
  }

  // Форматируем длительность для отображения
  const formatDuration = (durationMinutes: number) => {
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    if (hours === 0) {
      return `${minutes} минут`
    } else if (minutes === 0) {
      return hours === 1 ? `${hours} час` : hours < 5 ? `${hours} часа` : `${hours} часов`
    } else {
      const hoursText = hours === 1 ? `${hours} час` : hours < 5 ? `${hours} часа` : `${hours} часов`
      return `${hoursText} ${minutes} минут`
    }
  }

  // Форматируем тип повторения для отображения
  const formatRecurrenceType = (type: string) => {
    switch (type) {
      case "daily":
        return "Ежедневно"
      case "weekly":
        return "Еженедельно"
      case "weekdays":
        return "По рабочим дням"
      case "monthly":
        return "Ежемесячно"
      default:
        return "Не повторяется"
    }
  }

  // Обработчик клика по событию
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    // Предотвращаем открытие редактора при клике на событие
    e.stopPropagation()
  }

  // Обработчик редактирования события
  const handleEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentEvent(event)
    setIsEditing(true)
    setIsDrawerOpen(true)

    // Заполняем форму данными события
    const eventDate = new Date(event.date)

    // Определяем формат времени (AM/PM)
    const [hours] = event.time.split(":").map(Number)
    const timeFormat = hours < 12 ? "AM" : "PM"

    // Формируем дату окончания повторения, если она есть
    const recurrenceEndDate = event.recurrenceEndDate
      ? new Date(event.recurrenceEndDate).toISOString().split("T")[0]
      : ""

    setFormData({
      title: event.title,
      date: `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(
        eventDate.getDate(),
      ).padStart(2, "0")}`,
      time: event.time,
      timeFormat,
      duration: event.duration?.toString() || "60",
      description: event.description || "",
      isRecurring: !!event.recurrenceType,
      recurrenceType: event.recurrenceType || "daily",
      recurrenceEndDate,
    })
  }

  // Обработчик создания нового события
  const handleCreateEvent = () => {
    setCurrentEvent(null)
    setIsEditing(true)
    setIsDrawerOpen(true)

    // Определяем формат времени для текущего часа
    const currentHour = new Date().getHours()
    const timeFormat = currentHour < 12 ? "AM" : "PM"

    // Заполняем форму данными текущей даты
    setFormData({
      title: "",
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(
        selectedDate.getDate(),
      ).padStart(2, "0")}`,
      time: "12:00",
      timeFormat,
      duration: "60",
      description: "",
      isRecurring: false,
      recurrenceType: "daily",
      recurrenceEndDate: "",
    })
  }

  // Обработчик создания нового события на указанное время
  const handleCreateEventAtTime = (hour: number, minutes: number) => {
    setCurrentEvent(null)
    setIsEditing(true)
    setIsDrawerOpen(true)

    // Форматируем время в формате "HH:MM"
    const formattedHour = hour.toString().padStart(2, "0")
    const formattedTime = `${formattedHour}:${minutes.toString().padStart(2, "0")}`

    // Определяем формат времени (AM/PM)
    const hourNumber = Number(formattedTime.split(":")[0]);
    const timeFormat = hourNumber < 12 ? "AM" : "PM";

    // Заполняем форму данными текущей даты и указанным временем
    setFormData({
      title: "",
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(
        selectedDate.getDate(),
      ).padStart(2, "0")}`,
      time: formattedTime,
      timeFormat,
      duration: "60",
      description: "",
      isRecurring: false,
      recurrenceType: "daily",
      recurrenceEndDate: "",
    })
  }

  // Обработчик изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Обработчик изменения выпадающих списков
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Обработчик изменения переключателя
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  // Обработчик сохранения события
  const handleSaveEvent = () => {
    // Создаем объект события из данных формы
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
      ...(formData.isRecurring && {
        recurrenceType: formData.recurrenceType as 'daily' | 'weekly' | 'weekdays' | 'monthly',
        recurrenceEndDate: formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate).toISOString() : undefined,
      }),
      // Сохраняем дополнительные свойства из текущего события
      ...(currentEvent && {
        source: currentEvent.source,
        fromTask: currentEvent.fromTask,
        priority: currentEvent.priority,
      }),
    }

    // Обновляем список событий
    if (currentEvent) {
      // Редактирование существующего события
      const updatedEvents = events.map((event) =>
        event.id === currentEvent.id ? newEvent : event
      )
      onUpdateEvents(updatedEvents)
    } else {
      // Создание нового события
      onUpdateEvents([...events, newEvent])
    }

    // Показываем уведомление
    toast({
      title: currentEvent ? "Событие обновлено" : "Событие создано",
      description: `${newEvent.title} ${currentEvent ? "обновлено" : "добавлено"} в календарь`,
    })

    // Закрываем дровер
    setIsDrawerOpen(false)
    setCurrentEvent(null)
  }

  // Обработчик удаления события
  const handleDeleteEvent = () => {
    if (!currentEvent) return

    // Удаляем событие из списка
    const updatedEvents = events.filter((event) => event.id !== currentEvent.id)
    onUpdateEvents(updatedEvents)

    // Показываем уведомление
    toast({
      title: "Событие удалено",
      description: `${currentEvent.title} удалено из календаря`,
    })

    // Закрываем дровер
    setIsDrawerOpen(false)
  }

  // Закрытие дровера
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  // Обработчик начала перетаскивания события
  const handleDragStart = (event: CalendarEvent | null, e: React.DragEvent) => {
    e.stopPropagation()

    // Сохраняем начальную позицию перетаскивания
    dragStartY.current = e.clientY

    // Получаем час события
    const [eventHour] = event?.time.split(":").map(Number) || [0]
    draggedEventInitialHour.current = eventHour

    // Устанавливаем перетаскиваемое событие
    setDraggedEvent(event)
    onDragStart(event)

    // Устанавливаем данные для перетаскивания
    e.dataTransfer.setData("text/plain", String(event?.id || ''))

    // Устанавливаем эффект перетаскивания
    e.dataTransfer.effectAllowed = "move"

    // Добавляем прозрачность элементу при перетаскивании
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
  }

  // Обработчик начала перетаскивания задачи
  const handleTaskDragStart = (task: any) => {
    setDraggedTask(task)
  }

  // Обработчик окончания перетаскивания
  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()

    // Восстанавливаем прозрачность элемента
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }

    // Если нет перетаскиваемого события или нет целевого слота, отменяем
    if (!draggedEvent || dragOverSlot === null) {
      setDraggedEvent(null)
      onDragStart(null)
      setDragOverSlot(null)
      return
    }

    // Получаем текущие минуты события
    const [currentHours, currentMinutes] = draggedEvent.time.split(":").map(Number)

    // Обновляем время события через родительский компонент
    const hour = Math.floor(dragOverSlot / 4)
    const minute = (dragOverSlot % 4) * 15
    onUpdateEventTime(draggedEvent, hour, minute)

    // Показываем уведомление об успешном перемещении
    toast({
      title: "Событие перемещено",
      description: `Событие "${draggedEvent.title}" перемещено на ${formatHour(hour)}:${minute.toString().padStart(2, "0")}`,
    })

    // Сбрасываем состояние перетаскивания
    setDraggedEvent(null)
    onDragStart(null)
    setDragOverSlot(null)
    setDraggedTask(null)
  }

  // Добавляем компонент индикатора текущего времени
  function CurrentTimeIndicator() {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date())
      }, 60000) // Обновляем каждую минуту

      return () => clearInterval(timer)
    }, [])

    const now = new Date()
    const isToday = now.getDate() === selectedDate.getDate() &&
      now.getMonth() === selectedDate.getMonth() &&
      now.getFullYear() === selectedDate.getFullYear()

    if (!isToday) return null

    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const top = (hours * 60 + minutes) * SLOT_HEIGHT

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
          <div className="flex-1 relative">
            <div className="absolute left-0 right-0 h-0.5 bg-red-500" />
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full md:w-2/3 flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between pt-6 pb-4 px-6 border-b border-primary/20">
        <div className="flex-1"></div>
        <div className="flex flex-col items-center justify-center">
          <div className="text-6xl font-light leading-none">{selectedDate.getDate()}</div>
          <div className="text-xl mt-1">{weekdays[selectedDate.getDay()]}</div>
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
                    fontSize: '0.75rem', // Уменьшаем размер шрифта
                  }}
                >
                  {formatHour(hour)}
                </div>
              )
            })}
          </div>
          {/* Правая колонка — слоты и события */}
          <div
            className="flex-1 relative"
            onDragOver={e => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;

              // Автоматический скроллинг при перетаскивании
              const scrollContainer = e.currentTarget.parentElement;
              if (scrollContainer) {
                const scrollThreshold = 100; // пиксели от края для начала скроллинга
                const scrollSpeed = 10; // скорость скроллинга

                // Скроллим вниз если близко к нижнему краю
                if (rect.bottom - e.clientY < scrollThreshold) {
                  scrollContainer.scrollTop += scrollSpeed;
                }
                // Скроллим вверх если близко к верхнему краю
                if (e.clientY - rect.top < scrollThreshold) {
                  scrollContainer.scrollTop -= scrollSpeed;
                }
              }

              // Вычисляем точный слот с учетом высоты слота
              const slot = Math.round(y / (15 * SLOT_HEIGHT));
              setDragOverSlot(slot);
            }}
            onDrop={e => {
              e.preventDefault();
              if (draggedEvent && dragOverSlot !== null) {
                // Вычисляем точное время из позиции перетаскивания
                const slotMinutes = dragOverSlot * 15;
                const hour = Math.floor(slotMinutes / 60);
                const minute = slotMinutes % 60;

                // Обновляем время события
                onUpdateEventTime(draggedEvent, hour, minute);

                // Показываем уведомление
                toast({
                  title: "Событие перемещено",
                  description: `Событие "${draggedEvent.title}" перемещено на ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
                });

                // Сбрасываем состояние
                setDraggedEvent(null);
                setDragOverSlot(null);
                onDragStart(null);
              } else if (draggedTask && dragOverSlot !== null) {
                // Превращаем задачу в событие
                const slotMinutes = dragOverSlot * 15;
                const hour = Math.floor(slotMinutes / 60);
                const minute = slotMinutes % 60;
                onConvertTaskToEvent(draggedTask, hour, minute);

                // Сбрасываем ВСЕ состояния после создания события
                setDraggedTask(null);
                setDragOverSlot(null);
                setDraggedEvent(null);
                onDragStart(null);
              }
            }}
            onDragLeave={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX;
              const y = e.clientY;
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setDragOverSlot(null);
              }
            }}
            style={{ height: `${24 * 60 * SLOT_HEIGHT}px` }}
          >
            {/* Добавляем индикатор текущего времени */}
            <CurrentTimeIndicator />

            {/* События поверх слотов */}
            {groupEventsByTime(dayStartEvents).map((events, groupIndex) =>
              events.map((event) => {
                const { top, height, width, left } = getEventPosition(event, events)
                const now = new Date()
                const eventDateTime = new Date(event.date)
                eventDateTime.setHours(parseInt(event.time.split(':')[0]), parseInt(event.time.split(':')[1]), 0, 0)
                const isPastEvent = eventDateTime < now

                return (
                  <div
                    key={event.id}
                    data-event-id={event.id}
                    className={cn(
                      "absolute text-left px-1.5 py-0.5 rounded transition-all mb-0.5 group shadow-lg", // Уменьшаем отступы
                      "bg-primary/10 hover:bg-primary/15",
                      event.source === "outlook" && "border-l-4 border-blue-500",
                      event.source === "caldav" && "border-l-4 border-green-500",
                      event.source === "external" && "border-l-4 border-purple-500",
                      event.fromTask && "border-l-4 border-green-500",
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
                    onClick={(e: React.MouseEvent) => handleEventClick(event, e)}
                    draggable={true}
                    onDragStart={(e: React.DragEvent) => {
                      setDraggedEvent(event);
                      onDragStart(event);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(event.id || ''));
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = "0.5";
                      }
                    }}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center h-full overflow-hidden">
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium flex items-center gap-1 truncate text-sm", // Уменьшаем размер шрифта
                          height < 30 && "text-xs",
                          isPastEvent && "line-through text-white/50"
                        )}>
                          {event.title}
                          {event.recurrenceType && <Repeat className="h-3 w-3 text-primary/70 inline-block ml-1 flex-shrink-0" />}
                        </div>
                        {height >= 30 && (
                          <div className={cn(
                            "text-xs text-white/70 truncate",
                            isPastEvent && "text-white/40"
                          )}>
                            {formatTimeWithAmPm(event.time)} - {formatDuration(event.duration || 60)}
                          </div>
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
                  onClick={() => handleCreateEventAtTime(hour, minute)}
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

      {/* Дровер для просмотра и редактирования события - теперь вертикальный */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              {currentEvent ? (
                <DrawerTitle>Редактирование события</DrawerTitle>
              ) : (
                <DrawerTitle>Новое событие</DrawerTitle>
              )}
              <DrawerClose onClick={handleCloseDrawer} />
            </div>
          </DrawerHeader>

          <DrawerBody>
            {/* Режим редактирования */}
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
              </div>

              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium text-white/70">
                  Длительность
                </label>
                <Select value={formData.duration} onValueChange={(value) => handleSelectChange("duration", value)}>
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
                  className="bg-secondary/50 border-primary/20 text-white placeholder:text-white/40 min-h-[100px]"
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
                  onClick={handleDeleteEvent}
                  title="Удалить"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Удалить</span>
                </Button>
              )}
              <Button
                size="icon"
                className="h-12 w-12 "
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
