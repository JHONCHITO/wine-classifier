"use client";

import { useState, useEffect } from "react";
import {
  FlaskConical,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";

interface PredictionFormProps {
  modelTrained: boolean;
  onPrediction: (result: {
    prediction: number;
    wine_type: string;
    confidence: number | null;
    probabilities: Record<string, number> | null;
  }) => void;
}

const FEATURE_LABELS: Record<string, string> = {
  alcohol: "Alcohol (%)",
  malic_acid: "Acido Malico",
  ash: "Ceniza",
  alcalinity_of_ash: "Alcalinidad de Ceniza",
  magnesium: "Magnesio",
  total_phenols: "Fenoles Totales",
  flavanoids: "Flavonoides",
  nonflavanoid_phenols: "Fenoles No Flavonoides",
  proanthocyanins: "Proantocianinas",
  color_intensity: "Intensidad de Color",
  hue: "Matiz (Hue)",
  od280_od315: "OD280/OD315",
  proline: "Prolina",
};

const DEFAULT_VALUES = {
  alcohol: 13.0,
  malic_acid: 2.0,
  ash: 2.3,
  alcalinity_of_ash: 19.0,
  magnesium: 100.0,
  total_phenols: 2.5,
  flavanoids: 2.5,
  nonflavanoid_phenols: 0.3,
  proanthocyanins: 1.5,
  color_intensity: 5.0,
  hue: 1.0,
  od280_od315: 3.0,
  proline: 1000.0,
};

export function PredictionForm({
  modelTrained,
  onPrediction,
}: PredictionFormProps) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [sampleData, setSampleData] = useState<typeof DEFAULT_VALUES[]>([]);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await apiFetch("/api/dataset/sample");
        const data = await res.json();
        if (data.samples && data.samples.length > 0) {
          setSampleData(data.samples);
        }
      } catch (error) {
        console.error("Error fetching samples:", error);
      }
    };
    fetchSamples();
  }, []);

  const handlePredict = async () => {
    if (!modelTrained) return;

    setLoading(true);
    try {
      const res = await apiFetch("/api/predict", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        onPrediction(data);
      } else {
        console.error("Prediction error response:", data);
      }
    } catch (error) {
      console.error("Prediction error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = (index: number) => {
    if (sampleData[index]) {
      const sample = sampleData[index] as any;
      setValues({
        alcohol: sample.alcohol ?? DEFAULT_VALUES.alcohol,
        malic_acid: sample.malic_acid ?? DEFAULT_VALUES.malic_acid,
        ash: sample.ash ?? DEFAULT_VALUES.ash,
        alcalinity_of_ash:
          sample.alcalinity_of_ash ?? DEFAULT_VALUES.alcalinity_of_ash,
        magnesium: sample.magnesium ?? DEFAULT_VALUES.magnesium,
        total_phenols: sample.total_phenols ?? DEFAULT_VALUES.total_phenols,
        flavanoids: sample.flavanoids ?? DEFAULT_VALUES.flavanoids,
        nonflavanoid_phenols:
          sample.nonflavanoid_phenols ?? DEFAULT_VALUES.nonflavanoid_phenols,
        proanthocyanins:
          sample.proanthocyanins ?? DEFAULT_VALUES.proanthocyanins,
        color_intensity:
          sample.color_intensity ?? DEFAULT_VALUES.color_intensity,
        hue: sample.hue ?? DEFAULT_VALUES.hue,
        // mapeo correcto del nombre raro del backend
        od280_od315:
          sample["od280/od315_of_diluted_wines"] ?? DEFAULT_VALUES.od280_od315,
        proline: sample.proline ?? DEFAULT_VALUES.proline,
      });
    }
  };

  const resetForm = () => {
    setValues(DEFAULT_VALUES);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle>Nueva Prediccion</CardTitle>
        </div>
        <CardDescription>
          Ingresa las caracteristicas quimicas del vino para clasificarlo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!modelTrained && (
          <Alert>
            <AlertDescription>
              El modelo no esta entrenado. Por favor, entrena el modelo primero
              en la pestana de Entrenamiento.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={resetForm}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Resetear
          </Button>
          {sampleData.slice(0, 3).map((_, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => loadSampleData(index)}
            >
              Muestra {index + 1}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(values).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="text-xs">
                {FEATURE_LABELS[key] || key}
              </Label>
              <Input
                id={key}
                type="number"
                step="0.01"
                value={value}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [key]: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!modelTrained}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handlePredict}
          disabled={loading || !modelTrained}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Clasificando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Clasificar Vino
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
