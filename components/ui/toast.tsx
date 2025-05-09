"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Toast as ToastType } from '@/hooks/use-toast'

interface ToastProps {
    toast: ToastType
    onDismiss: (id: string) => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => onDismiss(toast.id), 300)
        }, 5000)

        return () => clearTimeout(timer)
    }, [toast.id, onDismiss])

    return (
        <div
            className={cn(
                'fixed bottom-4 right-4 z-50 flex w-full max-w-sm items-center space-x-4 rounded-lg p-4 shadow-lg transition-all duration-300',
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                toast.variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-background text-foreground'
            )}
        >
            <div className="flex-1">
                {toast.title && <div className="font-semibold">{toast.title}</div>}
                {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="ml-4 rounded-md p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
                <span className="sr-only">Закрыть</span>
                <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    )
} 