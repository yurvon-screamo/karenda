"use client"

import { useState, useCallback } from 'react'

export type Toast = {
    id: string
    title?: string
    description?: string
    variant?: 'default' | 'destructive'
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts((prevToasts) => [...prevToasts, { id, title, description, variant }])

        // Автоматически удаляем уведомление через 5 секунд
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
        }, 5000)
    }, [])

    const dismiss = useCallback((id: string) => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
    }, [])

    return {
        toasts,
        toast,
        dismiss,
    }
} 