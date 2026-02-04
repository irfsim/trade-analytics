"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--card-bg)] group-[.toaster]:text-[var(--foreground)] group-[.toaster]:border-[var(--border-subtle)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[var(--text-secondary)]",
          actionButton:
            "group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[var(--foreground)]",
          cancelButton:
            "group-[.toast]:bg-[var(--background)] group-[.toast]:text-[var(--text-secondary)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
