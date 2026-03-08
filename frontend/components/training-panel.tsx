"use client";

import { useState } from "react";
import { Play, Zap, Settings2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { apiFetch } from "@/lib/api";

interface TrainingPanelProps {
  onTrainingComplete: (result: {
    accuracy: number;
    confusion_matrix: number[][];
    classification_report: Record<string, unknown>;
  }) => void;
  onIterationsComplete: (result: {
    results: Array<{
      name: string;
      accuracy: number;
      confusion_matrix: number[][];
    }>;
    best_model: { name: string; accuracy: number };
  }) => void;
}

export function TrainingPanel({
  onTrainingComplete,
  onIterationsComplete,
}: TrainingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [loadingIterations, setLoadingIterations] = useState(false);
  const [config, setConfig] = useState({
    hidden_layers: "10",
    activation: "relu",
    solver: "adam",
    max_iter: 500,
    alpha: 0.0001,
    test_size: 0.3,
  });

  const handleTrain = async () => {
    setLoading(true);
    try {
      const hiddenLayers = config.hidden_layers
        .split(",")
        .map((n) => parseInt(n.trim()));

      const res = await apiFetch("/api/model/train", {
        method: "POST",
        body: JSON.stringify({
          hidden_layers: hiddenLayers,
          activation: config.activation,
          solver: config.solver,
          max_iter: config.max_iter,
          alpha: config.alpha,
          test_size: config.test_size,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onTrainingComplete(data);
      } else {
        console.error("Training error response:", data);
      }
    } catch (error) {
      console.error("Training error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunIterations = async () => {
    setLoadingIterations(true);
    try {
      const res = await apiFetch("/api/model/iterations");
      const data = await res.json();
      if (res.ok) {
        onIterationsComplete(data);
      } else {
        console.error("Iterations error response:", data);
      }
    } catch (error) {
      console.error("Iterations error:", error);
    } finally {
      setLoadingIterations(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>Configuracion del Modelo</CardTitle>
        </div>
        <CardDescription>
          Configura los hiperparametros de la red neuronal MLPClassifier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hidden_layers">Capas Ocultas</Label>
            <Input
              id="hidden_layers"
              value={config.hidden_layers}
              onChange={(e) =>
                setConfig({ ...config, hidden_layers: e.target.value })
              }
              placeholder="10, 5"
            />
            <p className="text-xs text-muted-foreground">
              Separar con comas (ej: 10, 5)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activation">Funcion de Activacion</Label>
            <Select
              value={config.activation}
              onValueChange={(value) =>
                setConfig({ ...config, activation: value })
              }
            >
              <SelectTrigger id="activation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relu">ReLU</SelectItem>
                <SelectItem value="tanh">Tanh</SelectItem>
                <SelectItem value="logistic">Logistic</SelectItem>
                <SelectItem value="identity">Identity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="solver">Optimizador</Label>
            <Select
              value={config.solver}
              onValueChange={(value) =>
                setConfig({ ...config, solver: value })
              }
            >
              <SelectTrigger id="solver">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adam">Adam</SelectItem>
                <SelectItem value="sgd">SGD</SelectItem>
                <SelectItem value="lbfgs">L-BFGS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_iter">
              Max Iteraciones: {config.max_iter}
            </Label>
            <Slider
              id="max_iter"
              min={100}
              max={2000}
              step={100}
              value={[config.max_iter]}
              onValueChange={(value) =>
                setConfig({ ...config, max_iter: value[0] })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alpha">Regularizacion (Alpha)</Label>
            <Input
              id="alpha"
              type="number"
              step="0.0001"
              value={config.alpha}
              onChange={(e) =>
                setConfig({
                  ...config,
                  alpha: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_size">
              Tamano Test: {(config.test_size * 100).toFixed(0)}%
            </Label>
            <Slider
              id="test_size"
              min={0.1}
              max={0.5}
              step={0.05}
              value={[config.test_size]}
              onValueChange={(value) =>
                setConfig({ ...config, test_size: value[0] })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleTrain}
            disabled={loading || loadingIterations}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrenando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Entrenar Modelo
              </>
            )}
          </Button>

          <Button
            onClick={handleRunIterations}
            disabled={loading || loadingIterations}
            variant="secondary"
            className="flex-1"
          >
            {loadingIterations ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Ejecutar 5 Iteraciones
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
