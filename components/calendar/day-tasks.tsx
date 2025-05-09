"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  X,
  Save,
  Edit,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"

// Типы
interface Task {
  id: number | string
  title: string
  date: string
  completed: boolean
  priority: "high" | "medium" | "low"
  description?: string
}

// Константы
const PRIORITY_CONFIG = {
  high: {
    color: "text-red-400",
    icon: AlertCircle,
    label: "Высокий"
  },
  medium: {
    color: "text-yellow-400",
    icon: ArrowUp,
    label: "Средний"
  },
  low: {
    color: "text-green-400",
    icon: ArrowDown,
    label: "Низкий"
  }
} as const

// Утилиты
const taskUtils = {
  formatDateToString: (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`
  },

  sortTasks: (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }
}

interface DayTasksProps {
  selectedDate: Date
  tasks: Task[]
  onUpdateTasks: (tasks: Task[]) => void
  onTaskDragStart: (task: Task) => void
}

export function DayTasks({ selectedDate, tasks, onUpdateTasks, onTaskDragStart }: DayTasksProps) {
  const { toast } = useToast()
  const storageKey = `tasks_${taskUtils.formatDateToString(selectedDate)}`

  // Загрузка задач из localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          onUpdateTasks(parsed)
        }
      } catch { }
    }
  }, [selectedDate])

  // Сохранение задач в localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks))
  }, [tasks, selectedDate])

  // Получаем и сортируем задачи на выбранную дату
  const dayTasks = taskUtils.sortTasks(
    tasks.filter(task => task.date === taskUtils.formatDateToString(selectedDate))
  )

  // Обработчики задач
  const handleAddTask = () => {
    const newTask: Task = {
      id: Date.now(),
      title: "",
      date: taskUtils.formatDateToString(selectedDate),
      completed: false,
      priority: "medium",
    }
    onUpdateTasks([...tasks, newTask])
  }

  const handleDeleteTask = (taskId: number | string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId)
    onUpdateTasks(updatedTasks)
    toast({
      title: "Задача удалена",
      description: "Задача успешно удалена",
    })
  }

  const handleToggleComplete = (taskId: number | string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, completed: !task.completed }
        : task
    )
    onUpdateTasks(updatedTasks)

    const task = tasks.find(t => t.id === taskId)
    if (task) {
      toast({
        title: task.completed ? "Задача не выполнена" : "Задача выполнена",
        description: `"${task.title}" ${task.completed ? "отмечена как невыполненная" : "отмечена как выполненная"}`,
      })
    }
  }

  const handleTaskChange = (taskId: number | string, field: keyof Task, value: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, [field]: value }
        : task
    )
    onUpdateTasks(updatedTasks)
  }

  const handleTitleBlur = (task: Task) => {
    if (!task.title.trim()) {
      handleDeleteTask(task.id)
    }
  }

  // Обработчики drag & drop
  const handleDragStart = (task: Task, e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.setData("application/json", JSON.stringify(task))
    e.dataTransfer.effectAllowed = "move"
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5"
    }
    onTaskDragStart(task)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1"
    }
  }

  return (
    <div className="mt-2 mb-2">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-white/70">Задачи на день</span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded border-none shadow-none hover:bg-primary/10 p-1"
            onClick={handleAddTask}
            title="Добавить задачу"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {dayTasks.length === 0 ? (
        <div className="text-center py-4 text-white/50">
          <p>На этот день нет задач</p>
        </div>
      ) : (
        <div className="space-y-1">
          {dayTasks.map(task => {
            const priorityConfig = PRIORITY_CONFIG[task.priority]
            const PriorityIcon = priorityConfig.icon

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all duration-150",
                  task.completed
                    ? "bg-white/5 text-white/50"
                    : "bg-primary/10 hover:bg-primary/15",
                )}
              >
                <button
                  className="flex-shrink-0"
                  onClick={() => handleToggleComplete(task.id)}
                  title={task.completed ? "Отметить как невыполненную" : "Отметить как выполненную"}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-primary/70" />
                  ) : (
                    <Circle className="h-4 w-4 text-white/70" />
                  )}
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <Input
                    name="title"
                    value={task.title}
                    onChange={e => handleTaskChange(task.id, "title", e.target.value)}
                    onBlur={() => handleTitleBlur(task)}
                    className="bg-secondary/50 border-primary/20 text-white h-8"
                  />
                  <Select
                    value={task.priority}
                    onValueChange={value => handleTaskChange(task.id, "priority", value)}
                  >
                    <SelectTrigger className="w-24 h-8 bg-secondary/50 border-primary/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1a2e] text-white border-primary/20">
                      {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                        <SelectItem
                          key={value}
                          value={value}
                          className={`${config.color} flex items-center justify-center`}
                        >
                          <config.icon className="h-4 w-4" />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!task.completed && (
                    <div
                      className="cursor-grab active:cursor-grabbing h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10"
                      title="Перетащите для планирования на конкретное время"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(task, e)}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-white/60" />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-red-500/20 hover:text-red-400"
                    onClick={() => handleDeleteTask(task.id)}
                    title="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-white/60" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <hr className="my-6 border-t border-white/10" />
    </div>
  )
}
