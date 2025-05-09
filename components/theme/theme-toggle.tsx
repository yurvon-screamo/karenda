"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme"
import { Button } from "@/components/ui"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 border-primary/20 hover:bg-white/10 dark:hover:bg-gray-800/60"
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span className="sr-only">Переключить тему</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{theme === "light" ? "Включить темную тему" : "Включить светлую тему"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
