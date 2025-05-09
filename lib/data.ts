import { CalendarEvent } from "./types"

export const events: CalendarEvent[] = [
  {
    id: 1,
    title: "Обед с Гари",
    date: "2025-05-04T11:45:00",
    time: "11:45",
    duration: 90, // в минутах
    description: "Обсуждение нового проекта и планирование следующих шагов.",
  },
  {
    id: 2,
    title: "Ужин с Терой",
    date: "2025-05-04T18:45:00",
    time: "18:45",
    duration: 120, // в минутах
    description: "Празднование завершения квартала.",
  },
  {
    id: 3,
    title: "Встреча с командой",
    date: "2025-05-06T10:00:00",
    time: "10:00",
    duration: 60, // в минутах
    description: "Еженедельная встреча с командой разработки.",
    recurrenceType: "weekly",
    recurrenceEndDate: "2025-06-30T10:00:00",
  },
  {
    id: 4,
    title: "Тренировка",
    date: "2025-05-07T17:30:00",
    time: "17:30",
    duration: 90, // в минутах
    description: "Силовая тренировка с тренером.",
    recurrenceType: "weekly",
  },
  {
    id: 5,
    title: "Созвон с клиентом",
    date: "2025-05-08T14:00:00",
    time: "14:00",
    duration: 45, // в минутах
    description: "Обсуждение требований к новому проекту.",
  },
  {
    id: 6,
    title: "Утренняя пробежка",
    date: "2025-05-04T07:00:00",
    time: "07:00",
    duration: 45, // в минутах
    description: "5 км по парковым дорожкам.",
    recurrenceType: "weekdays",
  },
  {
    id: 7,
    title: "Планирование недели",
    date: "2025-05-04T09:30:00",
    time: "09:30",
    duration: 60, // в минутах
    description: "Составление плана на неделю, расстановка приоритетов.",
    recurrenceType: "weekly",
  },
  {
    id: 8,
    title: "Вечерний созвон",
    date: "2025-05-04T21:00:00",
    time: "21:00",
    duration: 30, // в минутах
    description: "Созвон с командой из США.",
  },
]

export const tasks = [
  {
    id: 1,
    title: "Подготовить отчет",
    date: "2025-05-04",
    completed: false,
    priority: "high",
    description: "Подготовить ежемесячный отчет о проделанной работе",
  },
  {
    id: 2,
    title: "Ответить на письма",
    date: "2025-05-04",
    completed: true,
    priority: "medium",
    description: "Разобрать входящую почту и ответить на важные письма",
  },
  {
    id: 3,
    title: "Купить продукты",
    date: "2025-05-06",
    completed: false,
    priority: "low",
    description: "Молоко, хлеб, овощи, фрукты",
  },
  {
    id: 4,
    title: "Позвонить родителям",
    date: "2025-05-07",
    completed: false,
    priority: "medium",
    description: "",
  },
]
