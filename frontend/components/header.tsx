"use client"

import { Wine, Activity, Brain } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface HeaderProps {
  modelStatus: {
    trained: boolean
    accuracy: number | null
    message: string
  }
}

export function Header({ modelStatus }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Wine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Wine Classifier</h1>
            <p className="text-xs text-muted-foreground">Sistema Experto con MLPClassifier</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Red Neuronal</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${modelStatus.trained ? 'text-success' : 'text-warning'}`} />
            <Badge variant={modelStatus.trained ? "default" : "secondary"}>
              {modelStatus.trained ? `${(modelStatus.accuracy! * 100).toFixed(1)}% Accuracy` : 'Sin Entrenar'}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  )
}
