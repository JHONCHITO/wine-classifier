"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Ejemplos internos (no visibles)
const EXAMPLES: Record<string, string> = {
  "Texto plano": "el edificio es alto y el gato es negro",
  "Caesar Cipher (shift=3)": "ho hglilflr hv dors b ho jdwr hv qhjur",
  ROT13: "ry rqvsrvpb rf nygb l ry tngb rf art eb",
  Base64: "ZWwgZWRpZmljaW8gZXMgYWx0byB5IGVsIGdhdG8gZXMgbmVncm8=",
  "XOR edificio/gato":
    "2e09592e01102d0c1a220a592e16592a090d2445006b00156b02183f0a592e165925001e390a",
  "XOR perro/gato":
    "2e09593b000b390a592f101c39081c6b00176b00156b16162d045932451c27451e2a11166b08103904593b0a0b6b09186b131c2511182504",
  "XOR pajaro/perro":
    "3e0b593b04132a17166b130c2e09186b161629171c6b00156b040b290a156b1c593e0b593b000b390a59280a0b3900593b0a0b6b00156b0f1839011025",
  "XOR casa/jardin":
    "27045928040a2a450d2200172e450c2545132a171d220b592c171825011c6b1c593e0b592a100d24450b240f166b000a3f041a220a172a01166b041f3e000b2a",
};

export default function CryptoPage() {
  const [texto, setTexto] = useState("");

  const [result, setResult] = useState<null | {
    prediction: number;
    algorithm: string;
    confidence?: number;
    decoded_text?: string;
  }>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/crypto/predict-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto_cifrado: texto }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error en la API");
      }

      const data = await res.json();
      setResult({
        prediction: data.prediction,
        algorithm: data.algorithm,
        confidence: data.confidence,
        decoded_text: data.decoded_text,
      });

      if (data.decoded_text) {
        setTexto(data.decoded_text);
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-10 px-4">
      {/* Encabezado */}
      <header className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400">
          Detector de Algoritmos de Cifrado
        </h1>
        <p className="mt-2 text-sm md:text-base text-slate-300">
          Análisis de patrones mediante redes neuronales MLP para identificar
          el algoritmo de cifrado de un texto.
        </p>
      </header>

      {/* Contenedor principal */}
      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        {/* Card de clasificación */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl shadow-slate-950/40 p-5 md:p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Clasificación de texto cifrado
              </h2>
              <p className="text-xs text-slate-400">
                Pega un mensaje cifrado (Base64, César, ROT13, XOR en HEX, etc.)
                y la IA intentará identificar el algoritmo.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-violet-600/15 text-violet-300 border border-violet-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MLP activo
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium text-slate-300 mb-1"
                htmlFor="texto"
              >
                Mensaje cifrado
              </label>
              <textarea
                id="texto"
                name="texto"
                rows={7}
                className="w-full text-sm rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-400 transition"
                placeholder="Pega aquí el texto cifrado, por ejemplo: SGVsbG8gd29ybGQ= o un HEX XOR..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                La clasificación se basa en patrones estadísticos del texto, no
                garantiza el descifrado perfecto.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 text-xs font-semibold text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-400/40 hover:from-violet-400 hover:to-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-950/60">
                  🔍
                </span>
                {loading ? "Clasificando..." : "Clasificar texto"}
              </button>
            </div>

            {error && (
              <p className="mt-1 text-[12px] text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-1.5">
                Error: {error}
              </p>
            )}
          </form>
        </div>

        {/* Panel de resultado / explicación */}
        <aside className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 shadow-xl shadow-slate-950/40 backdrop-blur">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              Resultado del análisis
            </h3>

            {!result && (
              <p className="text-xs text-slate-400">
                Esperando texto para analizar… Cuando envíes un mensaje
                cifrado, aquí verás el algoritmo detectado, la confianza del
                modelo y, si es posible, el texto descifrado.
              </p>
            )}

            {result && (
              <div className="space-y-2 text-xs text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Algoritmo detectado:</span>
                  <span className="font-semibold text-emerald-400">
                    {result.algorithm}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Clase (ID interna):</span>
                  <span className="font-mono text-slate-200">
                    {result.prediction}
                  </span>
                </div>
                {result.confidence !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Confianza:</span>
                    <span className="font-mono text-slate-200">
                      {(result.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-slate-400 mb-1">Texto en claro:</p>
                  <div className="text-[11px] font-mono bg-slate-950/70 border border-slate-700/70 rounded-lg px-3 py-2 max-h-40 overflow-auto">
                    {result.decoded_text ??
                      "No se pudo descifrar el texto con el algoritmo detectado."}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-4 text-[11px] text-slate-400 space-y-2">
            <h4 className="text-xs font-semibold text-slate-200">
              ¿Cómo funciona este módulo?
            </h4>
            <p>
              El sistema extrae características del texto cifrado (longitud,
              distribución de caracteres, patrones de repetición, etc.) y las
              envía a una red neuronal MLP entrenada para distinguir distintos
              algoritmos de cifrado.
            </p>
            <p>
              Es ideal para experimentos educativos en criptografía y para
              mostrarle a otros cómo una IA puede detectar patrones en datos
              aparentemente aleatorios.[web:219]
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
