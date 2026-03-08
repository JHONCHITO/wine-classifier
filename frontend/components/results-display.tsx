"use client"

import { Wine, TrendingUp, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface ResultsDisplayProps {
  prediction: {
    prediction: number
    wine_type: string
    confidence: number | null
    probabilities: Record<string, number> | null
  }
}

const WINE_COLORS: Record<number, string> = {
  1: "from-chart-1 to-chart-1/70",
  2: "from-chart-2 to-chart-2/70",
  3: "from-chart-3 to-chart-3/70"
}

const WINE_BG_COLORS: Record<number, string> = {
  1: "bg-chart-1/20",
  2: "bg-chart-2/20",
  3: "bg-chart-3/20"
}

export function ResultsDisplay({ prediction }: ResultsDisplayProps) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-2 bg-gradient-to-r ${WINE_COLORS[prediction.prediction] || WINE_COLORS[1]}`} />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>Resultado de la Prediccion</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
            Clase {prediction.prediction}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`rounded-xl p-6 ${WINE_BG_COLORS[prediction.prediction] || WINE_BG_COLORS[1]}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background/80">
              <Wine className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Vino</p>
              <p className="text-xl font-bold text-foreground">{prediction.wine_type}</p>
            </div>
          </div>
        </div>

        {prediction.confidence && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Confianza</span>
              </div>
              <span className="font-mono text-lg font-bold text-primary">
                {(prediction.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={prediction.confidence * 100} className="h-3" />
          </div>
        )}

        {prediction.probabilities && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Probabilidades por Clase</p>
            {Object.entries(prediction.probabilities).map(([name, prob], index) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{name}</span>
                  <span className="font-mono text-muted-foreground">{(prob * 100).toFixed(2)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${prob * 100}%`,
                      backgroundColor: `var(--chart-${index + 1})`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
