"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/calendar/calendar"
import { EventDetails } from "@/components/calendar/event-details"
import { BackgroundGradient } from "@/components/ui/background-gradient"
import { useToast } from "@/hooks/use-toast"
import { CalendarEvent, Task } from "@/lib/types"
import { LocalCalendarStorage } from "@/lib/storage"
import { notificationUtils } from "@/lib/notifications"
import { CalendarRepository } from "@/lib/calendar-repository"

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const { toast } = useToast()
  const calendarRepo = CalendarRepository.getInstance()

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const events = await calendarRepo.getEvents()
        setCalendarEvents(events)
      } catch (error) {
        console.error('Ошибка при загрузке событий:', error)
        toast({
          title: "Ошибка загрузки",
          description: "Не удалось загрузить события календаря",
        })
      }
    }

    loadEvents()
  }, [])

  // Сохранение событий при их изменении
  useEffect(() => {
    const saveEvents = async () => {
      try {
        // Проверяем, что события действительно изменились
        const currentEvents = await calendarRepo.getEvents()
        const hasChanges = JSON.stringify(currentEvents) !== JSON.stringify(calendarEvents)

        if (hasChanges) {
          console.log('Сохранение изменений в событиях:', {
            before: currentEvents.map(e => ({ id: e.id, source: e.source })),
            after: calendarEvents.map(e => ({ id: e.id, source: e.source }))
          })

          // Удаляем дубликаты перед сохранением
          const uniqueEvents = calendarEvents.filter((event, index, self) =>
            index === self.findIndex(e => e.id === event.id)
          )

          await calendarRepo.saveEvents(uniqueEvents)
        }
      } catch (error) {
        console.error('Ошибка при сохранении событий:', error)
        toast({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить события календаря",
        })
      }
    }

    if (calendarEvents.length > 0) {
      saveEvents()
    }
  }, [calendarEvents])

  // Обработчик перетаскивания события на другой день
  const handleEventDroppedOnDay = async (event: CalendarEvent, targetDate: Date) => {
    try {
      // Получаем время из исходного события
      const [hours, minutes] = event.time.split(":").map(Number)

      // Создаем новую дату, сохраняя время
      const newDate = new Date(targetDate)
      newDate.setHours(hours, minutes)

      // Обновляем событие
      const updatedEvent = {
        ...event,
        date: newDate.toISOString(),
      }

      // Обновляем список событий
      const events = await calendarRepo.getEvents()
      const index = events.findIndex(e => e.id === updatedEvent.id)
      if (index !== -1) {
        events[index] = updatedEvent
        await calendarRepo.saveEvents(events)
        setCalendarEvents(events)
      }

      // Показываем уведомление об успешном перемещении
      const monthNames = [
        "Января", "Февраля", "Марта", "Апреля", "Мая", "Июня",
        "Июля", "Августа", "Сентября", "Октября", "Ноября", "Декабря",
      ]

      toast({
        title: "Событие перемещено",
        description: `Событие "${event.title}" перемещено на ${targetDate.getDate()} ${monthNames[targetDate.getMonth()]}`,
      })

      // Сбрасываем состояние перетаскивания
      setDraggedEvent(null)

      // Обновляем выбранную дату на целевую
      setSelectedDate(targetDate)
    } catch (error) {
      console.error('Ошибка при перемещении события:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось переместить событие",
        variant: "destructive",
      })
    }
  }

  // Обработчик обновления времени события внутри дня
  const handleUpdateEventTime = async (event: CalendarEvent, newHour: number, newMinute: number) => {
    try {
      console.log('Обновление времени события:', { event, newHour, newMinute })

      const newTime = `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`

      // Обновляем дату события
      const eventDate = new Date(event.date)
      eventDate.setHours(newHour, newMinute)

      const updatedEvent = {
        ...event,
        time: newTime,
        date: eventDate.toISOString(),
      }

      console.log('Обновленное событие:', updatedEvent)

      // Обновляем список событий
      const events = await calendarRepo.getEvents()

      // Ищем событие, учитывая как оригинальные, так и сгенерированные события
      const index = events.findIndex(e => {
        // Проверяем точное совпадение ID
        if (e.id === updatedEvent.id) return true
        // Проверяем, является ли это сгенерированным событием
        if (typeof e.id === 'string' && e.id.startsWith(`${updatedEvent.id}-recurrence-`)) return true
        return false
      })

      if (index !== -1) {
        events[index] = updatedEvent
        // Обновляем состояние, что вызовет useEffect для сохранения
        setCalendarEvents(events)

        toast({
          title: "Время обновлено",
          description: `Событие "${event.title}" перемещено на ${newTime}`,
        })
      } else {
        console.error('Событие не найдено:', { eventId: event.id, events })
        throw new Error('Событие не найдено')
      }
    } catch (error) {
      console.error('Ошибка при обновлении времени события:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить время события",
        variant: "destructive",
      })
      throw error // Пробрасываем ошибку дальше
    }
  }

  const handleConvertTaskToEvent = async (task: Task, hour: number, minute: number) => {
    try {
      const eventDate = new Date(selectedDate)
      eventDate.setHours(hour, minute, 0, 0)

      const newEvent: CalendarEvent = {
        id: `task-to-event-${task.id}-${Date.now()}`,
        title: task.title,
        date: eventDate.toISOString(),
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        duration: 60, // По умолчанию 1 час
        description: task.description || "",
        priority: task.priority,
        source: "task",
        participants: []
      }

      // Добавляем новое событие
      const events = await calendarRepo.getEvents()
      events.push(newEvent)
      setCalendarEvents(events)

      // Удаляем задачу
      const updatedTasks = tasks.filter((t) => t.id !== task.id)
      setTasks(updatedTasks)

      // Показываем уведомление
      toast({
        title: "Задача преобразована в событие",
        description: `Задача "${task.title}" запланирована на ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      })
    } catch (error) {
      console.error('Ошибка при преобразовании задачи в событие:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось преобразовать задачу в событие",
        variant: "destructive",
      })
    }
  }

  // Обработчик добавления новых событий при синхронизации
  const handleSyncComplete = async (syncedEvents: CalendarEvent[]) => {
    try {
      const events = await calendarRepo.syncEvents(syncedEvents)
      setCalendarEvents(events)
    } catch (error) {
      console.error('Ошибка при синхронизации:', error)
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось синхронизировать события",
        variant: "destructive",
      })
    }
  }

  // Генерация повторяющихся событий
  useEffect(() => {
    // Получаем базовые события (без сгенерированных повторений)
    const baseEvents = calendarEvents.filter((event) => !event.isGenerated)

    // Массив для хранения сгенерированных событий
    const generatedEvents: CalendarEvent[] = []

    // Текущая дата для проверки
    const now = new Date()

    // Генерируем события на 3 месяца вперед
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)

    // Обрабатываем каждое повторяющееся событие
    baseEvents.forEach((event) => {
      if (!event.recurrenceType) return

      // Получаем дату начала события
      const startDate = new Date(event.date)

      // Получаем дату окончания повторения (если указана)
      const recurrenceEndDate = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : endDate

      // Текущая дата для итерации
      const currentDate = new Date(startDate)

      // Пропускаем исходное событие
      currentDate.setDate(currentDate.getDate() + 1)

      // Генерируем повторения в зависимости от типа
      while (currentDate <= recurrenceEndDate && currentDate <= endDate) {
        let shouldAddEvent = false

        switch (event.recurrenceType) {
          case "daily":
            shouldAddEvent = true
            currentDate.setDate(currentDate.getDate() + 1)
            break

          case "weekly":
            shouldAddEvent = true
            currentDate.setDate(currentDate.getDate() + 7)
            break

          case "weekdays":
            // Проверяем, является ли день рабочим (пн-пт)
            const dayOfWeek = currentDate.getDay()
            shouldAddEvent = dayOfWeek >= 1 && dayOfWeek <= 5
            currentDate.setDate(currentDate.getDate() + 1)
            break

          case "monthly":
            shouldAddEvent = true
            currentDate.setMonth(currentDate.getMonth() + 1)
            break
        }

        if (shouldAddEvent && currentDate <= recurrenceEndDate) {
          // Создаем копию события с новой датой
          const newDate = new Date(currentDate)
          newDate.setHours(startDate.getHours(), startDate.getMinutes())

          generatedEvents.push({
            ...event,
            id: `${event.id}-recurrence-${newDate.getTime()}`,
            date: newDate.toISOString(),
            isGenerated: true, // Помечаем как сгенерированное
          })
        }
      }
    })

    // Объединяем базовые события с сгенерированными
    const filteredEvents = calendarEvents.filter((event) => !event.isGenerated)
    const newEvents = [...filteredEvents, ...generatedEvents]
    const isSame =
      newEvents.length === calendarEvents.length &&
      newEvents.every((e, i) => e.id === calendarEvents[i].id)

    if (!isSame) {
      setCalendarEvents(newEvents)
    }
  }, [
    calendarEvents
      .filter((e) => !e.isGenerated)
      .map((e) => JSON.stringify(e))
      .join(),
  ])

  useEffect(() => {
    // Запрашиваем разрешение на уведомления при загрузке страницы
    notificationUtils.requestPermission()

    // Проверяем уведомления каждую минуту
    const notificationInterval = setInterval(() => {
      notificationUtils.checkEventNotifications(calendarEvents)
    }, 60000)

    return () => clearInterval(notificationInterval)
  }, [calendarEvents])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <BackgroundGradient />
      <div className="relative z-10 flex w-full max-w-8xl flex-col md:flex-row rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 via-background/80 to-primary/5 backdrop-blur-md shadow-2xl h-[calc(100vh-2rem)] border border-primary/10">
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSelectEvent={setSelectedEvent}
          onEventDropped={handleEventDroppedOnDay}
          draggedEvent={draggedEvent}
          events={calendarEvents}
        />
        <EventDetails
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          events={calendarEvents}
          tasks={tasks}
          onUpdateEvents={setCalendarEvents}
          onUpdateTasks={setTasks}
          onUpdateEventTime={handleUpdateEventTime}
          onSyncComplete={handleSyncComplete}
          onDragStart={setDraggedEvent}
          onConvertTaskToEvent={handleConvertTaskToEvent}
        />
      </div>
    </main>
  )
}
