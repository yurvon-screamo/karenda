"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "@/components/theme-provider"

export function BackgroundGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Создаем градиент в зависимости от темы
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)

    if (theme === "light") {
      // Светлая тема - нежные пастельные оттенки
      gradient.addColorStop(0, "#f5f3ff") // Очень светлый фиолетовый
      gradient.addColorStop(0.5, "#faf5ff") // Очень светлый пурпурный
      gradient.addColorStop(1, "#fdf2f8") // Очень светлый розовый
    } else {
      // Темная тема - глубокие насыщенные оттенки
      gradient.addColorStop(0, "#4a1d96") // Темно-фиолетовый
      gradient.addColorStop(0.5, "#8b5cf6") // Фиолетовый
      gradient.addColorStop(1, "#db2777") // Розовый
    }

    const animate = () => {
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Создаем эффект потока
      const time = Date.now() * 0.001
      const x = Math.sin(time) * 100
      const y = Math.cos(time) * 100

      // Добавляем светлые пятна для эффекта свечения
      if (theme === "light") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      }

      ctx.beginPath()
      ctx.arc(canvas.width / 2 + x, canvas.height / 2 + y, 300, 0, Math.PI * 2)
      ctx.fill()

      // Добавляем еще одно светлое пятно
      if (theme === "light") {
        ctx.fillStyle = "rgba(219, 39, 119, 0.05)" // Светло-розовый оттенок
      } else {
        ctx.fillStyle = "rgba(219, 39, 119, 0.1)" // Розовый оттенок
      }

      ctx.beginPath()
      ctx.arc(canvas.width / 3 - x / 2, canvas.height / 3 - y / 2, 200, 0, Math.PI * 2)
      ctx.fill()

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [theme])

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" aria-hidden="true" />
}
