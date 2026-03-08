"use client";

import { useEffect, useState } from "react";
import {
  History,
  Trash2,
  RefreshCw,
  Wine,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface PredictionRecord {
  _id: string;
  timestamp: string;
  input: Record<string, number>;
  prediction: number;
  wine_type: string;
  confidence: number | null;
}

export function PredictionHistory() {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/predictions/history?limit=50");
      const data = await res.json();
      if (res.ok && data.predictions) {
        setPredictions(data.predictions);
      }
      if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError("Error al cargar el historial");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await apiFetch("/api/predictions/clear", {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("Error clearing history response:", await res.text());
      }
      fetchHistory();
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Historial de Predicciones</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button variant="destructive" size="sm" onClick={clearHistory}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>
        <CardDescription>
          Historial de clasificaciones realizadas (almacenadas en MongoDB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border p-4"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wine className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">
              No hay predicciones
            </p>
            <p className="text-sm text-muted-foreground">
              Las predicciones realizadas apareceran aqui
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {predictions.map((pred) => (
                <div
                  key={pred._id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-1/20">
                    <Wine className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {pred.wine_type}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(pred.timestamp)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      Clase {pred.prediction}
                    </Badge>
                    {pred.confidence !== null && (
                      <p className="text-xs text-muted-foreground">
                        {(pred.confidence * 100).toFixed(1)}% confianza
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
