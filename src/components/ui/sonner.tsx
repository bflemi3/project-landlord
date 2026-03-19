"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon />,
        info: <InfoIcon />,
        warning: <TriangleAlertIcon />,
        error: <OctagonXIcon />,
        loading: <Loader2Icon className="animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--action-button-bg": "var(--primary)",
          "--action-button-text": "var(--primary-foreground)",
          "--action-button-border": "transparent",
          "--cancel-button-bg": "var(--secondary)",
          "--cancel-button-text": "var(--secondary-foreground)",
          "--cancel-button-border": "transparent",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast text-base gap-3",
          icon: "[&_svg]:size-5",
          title: "text-base",
          description: "text-base mt-2",
          actionButton: "!text-base !rounded-lg !px-4 !py-2 !font-medium",
          cancelButton: "!text-base !rounded-lg !px-4 !py-2 !font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
