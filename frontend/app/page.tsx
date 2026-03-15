"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { DatasetInfo } from "@/components/dataset-info";
// import { TrainingPanel } from "@/components/training-panel"; // ya no se usa
// import { PredictionForm } from "@/components/prediction-form"; // antiguo de vinos
import { ResultsDisplay } from "@/components/results-display";
// import { IterationsComparison } from "@/components/iterations-comparison";
import { PredictionHistory } from "@/components/prediction-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";

type CryptoPrediction = {
  prediction: number;
  algorithm: string;
  confidence: number | null;
  probabilities: Record<string, number> | null;
};

export default function Home() {
  const [modelStatus, setModelStatus] = useState<{
    trained: boolean;
    accuracy: number | null;
    message: string;
  }>({ trained: false, accuracy: null, message: "Cargando..." });

  const [lastPrediction, setLastPrediction] = useState<CryptoPrediction | null>(
    null
  );

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

  // Formulario simple de cifrado dentro de esta página (en vez de PredictionForm antiguo)
  const [form, setForm] = useState({
    longitud: 80,
    entropia: 4.0,
    freq_mayusculas: 0.1,
    freq_minusculas: 0.6,
    freq_numeros: 0.1,
    freq_espacios: 0.0,
    freq_especiales: 0.2,
    rango_ascii_min: 48,
    rango_ascii_max: 122,
    media_ascii: 90,
    varianza_ascii: 500,
    freq_char_top1: 0.18,
    freq_char_top2: 0.12,
    tiene_padding: 0,
    proporcion_alpha: 0.8,
    unique_chars: 20,
    ratio_unique: 0.35,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleCryptoPredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLastPrediction(null);

    try {
      const res = await apiFetch("/api/crypto/predict", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error en la API");
      }

      const data = (await res.json()) as CryptoPrediction;
      setLastPrediction(data);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const fieldLabels: Record<keyof typeof form, string> = {
    longitud: "longitud",
    entropia: "entropia",
    freq_mayusculas: "freq_mayusculas",
    freq_minusculas: "freq_minusculas",
    freq_numeros: "freq_numeros",
    freq_espacios: "freq_espacios",
    freq_especiales: "freq_especiales",
    rango_ascii_min: "rango_ascii_min",
    rango_ascii_max: "rango_ascii_max",
    media_ascii: "media_ascii",
    varianza_ascii: "varianza_ascii",
    freq_char_top1: "freq_char_top1",
    freq_char_top2: "freq_char_top2",
    tiene_padding: "tiene_padding (0 o 1)",
    proporcion_alpha: "proporcion_alpha",
    unique_chars: "unique_chars",
    ratio_unique: "ratio_unique",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header modelStatus={modelStatus} />

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="predict">Predicción cifrado</TabsTrigger>
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
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Backend API</span>
                      <span className="text-success font-medium">
                        Conectado
                      </span>
                    </div>
                  </div>
                </div>

                {lastPrediction && (
                  <ResultsDisplay
                    prediction={{
                      prediction: lastPrediction.prediction,
                      wine_type: lastPrediction.algorithm, // reutilizamos prop
                      confidence: lastPrediction.confidence,
                      probabilities: lastPrediction.probabilities,
                    }}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="predict" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={handleCryptoPredict}
                className="space-y-4 rounded-xl border border-border bg-card p-6"
              >
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  Predicción de algoritmo de cifrado
                </h3>
                <p className="text-sm text-muted-foreground">
                  Introduce las 17 características del texto cifrado y el
                  sistema te indicará qué algoritmo se usó.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(form) as (keyof typeof form)[]).map((key) => (
                    <div key={key} className="flex flex-col">
                      <label
                        htmlFor={key}
                        className="text-sm font-medium mb-1"
                      >
                        {fieldLabels[key]}
                      </label>
                      <input
                        id={key}
                        name={key}
                        type="number"
                        step="0.0001"
                        value={form[key]}
                        onChange={handleChange}
                        className="border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !modelStatus.trained}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {loading ? "Clasificando..." : "Clasificar cifrado"}
                </button>

                {error && (
                  <p className="mt-2 text-sm text-red-600">Error: {error}</p>
                )}
              </form>

              {lastPrediction && (
                <ResultsDisplay
                  prediction={{
                    prediction: lastPrediction.prediction,
                    wine_type: lastPrediction.algorithm,
                    confidence: lastPrediction.confidence,
                    probabilities: lastPrediction.probabilities,
                  }}
                />
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
