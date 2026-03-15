"use client";

import { useEffect, useState } from "react";
import { Database, FlaskConical, Grape, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface DatasetInfoData {
  name: string;
  description: string;
  n_samples: number;
  n_features: number;
  feature_names: string[];
  target_names: string[];
  class_distribution?: Record<string, number>; // ahora es opcional
}

export function DatasetInfo() {
  const [data, setData] = useState<DatasetInfoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch("/api/dataset/info");
        if (!res.ok) {
          throw new Error("Error en dataset/info");
        }
        const json = (await res.json()) as DatasetInfoData;
        setData(json);
      } catch (error) {
        console.error("Error fetching dataset info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>{data.name}</CardTitle>
        </div>
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">Muestras</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {data.n_samples}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FlaskConical className="h-4 w-4" />
              <span className="text-sm">Características</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {data.n_features}
            </p>
          </div>
        </div>

        {/* Distribución de clases solo si viene del backend */}
        {data.class_distribution && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Grape className="h-4 w-4" />
              Distribución de clases
            </h4>
            <div className="space-y-2">
              {Object.entries(data.class_distribution).map(
                ([name, count], index) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            index === 0
                              ? "var(--chart-1)"
                              : index === 1
                              ? "var(--chart-2)"
                              : "var(--chart-3)",
                        }}
                      />
                      <span className="text-sm text-foreground">{name}</span>
                    </div>
                    <Badge variant="outline">{count} muestras</Badge>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Características del texto cifrado
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.feature_names.map((name) => (
              <Badge key={name} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
