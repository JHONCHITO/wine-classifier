"use client"

import { Trophy, TrendingUp, BarChart2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface IterationsComparisonProps {
  data: {
    results: Array<{
      name: string
      accuracy: number
      confusion_matrix: number[][]
      config?: Record<string, unknown>
    }>
    best_model: { name: string; accuracy: number }
  }
}

export function IterationsComparison({ data }: IterationsComparisonProps) {
  const maxAccuracy = Math.max(...data.results.map(r => r.accuracy))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle>Comparacion de Iteraciones</CardTitle>
          </div>
          <Badge variant="default" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            {data.best_model.name}: {(data.best_model.accuracy * 100).toFixed(2)}%
          </Badge>
        </div>
        <CardDescription>
          Resultados de las 5 arquitecturas diferentes evaluadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-center">Exactitud</TableHead>
                <TableHead className="text-center">Rendimiento</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((result) => (
                <TableRow 
                  key={result.name}
                  className={result.accuracy === maxAccuracy ? "bg-success/10" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {result.accuracy === maxAccuracy && (
                        <Trophy className="h-4 w-4 text-warning" />
                      )}
                      {result.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-lg font-bold">
                      {(result.accuracy * 100).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="mx-auto w-full max-w-32">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div 
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${result.accuracy * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {result.accuracy === maxAccuracy ? (
                      <Badge variant="default" className="bg-success text-success-foreground">
                        Mejor
                      </Badge>
                    ) : result.accuracy >= 0.9 ? (
                      <Badge variant="secondary">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Bueno
                      </Badge>
                    ) : (
                      <Badge variant="outline">Regular</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((result) => (
            <div 
              key={result.name} 
              className={`rounded-lg border p-4 ${result.accuracy === maxAccuracy ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-foreground">{result.name}</span>
                <span className="font-mono text-sm text-primary">{(result.accuracy * 100).toFixed(1)}%</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Matriz de Confusion</p>
              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                {result.confusion_matrix.map((row, i) => (
                  row.map((cell, j) => (
                    <div 
                      key={`${i}-${j}`}
                      className={`rounded p-1.5 font-mono ${i === j ? 'bg-success/20 text-success' : 'bg-muted/50 text-foreground'}`}
                    >
                      {cell}
                    </div>
                  ))
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
