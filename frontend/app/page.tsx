"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { DatasetInfo } from "@/components/dataset-info";
import { TrainingPanel } from "@/components/training-panel";
import { PredictionForm } from "@/components/prediction-form";
import { ResultsDisplay } from "@/components/results-display";
import { IterationsComparison } from "@/components/iterations-comparison";
import { PredictionHistory } from "@/components/prediction-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const [modelStatus, setModelStatus] = useState<{
    trained: boolean;
    accuracy: number | null;
    message: string;
  }>({ trained: false, accuracy: null, message: "Cargando..." });

  const [lastPrediction, setLastPrediction] = useState<{
    prediction: number;
    wine_type: string;
    confidence: number | null;
    probabilities: Record<string, number> | null;
  } | null>(null);

  const [trainingResult, setTrainingResult] = useState<{
    accuracy: number;
    confusion_matrix: number[][];
    classification_report: Record<string, unknown>;
  } | null>(null);

  const [iterationsResult, setIterationsResult] = useState<{
    results: Array<{
      name: string;
      accuracy: number;
      confusion_matrix: number[][];
    }>;
    best_model: { name: string; accuracy: number };
  } | null>(null);

  const checkModelStatus = async () => {
    try {
      const res = await apiFetch("/api/model/status");
      const data = await res.json();
      setModelStatus(data);
    } catch {
      setModelStatus({
        trained: false,
        accuracy: null,
        message: "Error al conectar con el servidor",
      });
    }
  };

  useEffect(() => {
    checkModelStatus();
  }, []);

  const handleTrainingComplete = (result: typeof trainingResult) => {
    setTrainingResult(result);
    checkModelStatus();
  };

  const handleIterationsComplete = (result: typeof iterationsResult) => {
    setIterationsResult(result);
    checkModelStatus();
  };

  const handlePrediction = (result: typeof lastPrediction) => {
    setLastPrediction(result);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header modelStatus={modelStatus} />

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="training">Entrenamiento</TabsTrigger>
            <TabsTrigger value="predict">Prediccion</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <DatasetInfo />
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                    Estado del Sistema
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Modelo</span>
                      <span
                        className={`font-medium ${
                          modelStatus.trained ? "text-success" : "text-warning"
                        }`}
                      >
                        {modelStatus.trained ? "Entrenado" : "Sin entrenar"}
                      </span>
                    </div>
                    {modelStatus.accuracy !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Exactitud
                        </span>
                        <span className="font-mono text-primary">
                          {(modelStatus.accuracy * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Backend API
                      </span>
                      <span className="text-success font-medium">
                        Conectado
                      </span>
                    </div>
                  </div>
                </div>

                {lastPrediction && (
                  <ResultsDisplay prediction={lastPrediction} />
                )}
              </div>
            </div>

            {iterationsResult && (
              <IterationsComparison data={iterationsResult} />
            )}
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <TrainingPanel
                onTrainingComplete={handleTrainingComplete}
                onIterationsComplete={handleIterationsComplete}
              />
              {trainingResult && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-4 text-lg font-semibold text-card-foreground">
                      Resultado del Entrenamiento
                    </h3>
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Exactitud
                        </p>
                        <p className="text-4xl font-bold text-primary">
                          {(trainingResult.accuracy * 100).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          Matriz de Confusion
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="p-2 text-muted-foreground"></th>
                                <th className="p-2 text-muted-foreground">
                                  C1
                                </th>
                                <th className="p-2 text-muted-foreground">
                                  C2
                                </th>
                                <th className="p-2 text-muted-foreground">
                                  C3
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {trainingResult.confusion_matrix.map(
                                (row, i) => (
                                  <tr key={i}>
                                    <td className="p-2 font-medium text-muted-foreground">
                                      C{i + 1}
                                    </td>
                                    {row.map((cell, j) => (
                                      <td
                                        key={j}
                                        className={`p-2 text-center font-mono ${
                                          i === j
                                            ? "bg-success/20 text-success"
                                            : "text-foreground"
                                        }`}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {iterationsResult && (
              <IterationsComparison data={iterationsResult} />
            )}
          </TabsContent>

          <TabsContent value="predict" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <PredictionForm
                modelTrained={modelStatus.trained}
                onPrediction={handlePrediction}
              />
              {lastPrediction && (
                <ResultsDisplay prediction={lastPrediction} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <PredictionHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
