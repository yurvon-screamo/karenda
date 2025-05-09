"use client"

import { useToast } from '@/hooks/use-toast'
import { Toast } from '@/components/toast'

export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
        </div>
    )
} 