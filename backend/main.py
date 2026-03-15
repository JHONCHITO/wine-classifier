import os
import math
from collections import Counter
from datetime import datetime
from typing import Optional, Dict

import numpy as np
import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
import joblib
from dotenv import load_dotenv
import base64

# Intentar importar pymongo (opcional)
try:
    from pymongo import MongoClient
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False

# =====================================
# Configuración básica de la API
# =====================================

load_dotenv()  # lee backend/.env

app = fastapi.FastAPI(
    title="Crypto Encryption Algorithm Classification API",
    version="1.0.0",
)

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variables globales del modelo
model: Optional[MLPClassifier] = None
scaler: Optional[StandardScaler] = None
model_accuracy: Optional[float] = None
model_trained: bool = False

# MongoDB
db = None
predictions_collection = None

# Rutas de los archivos del modelo
CRYPTO_MODEL_PATH = os.environ.get(
    "CRYPTO_MODEL_PATH",
    "backend/models/crypto_mlp_model.joblib",
)
CRYPTO_SCALER_PATH = os.environ.get(
    "CRYPTO_SCALER_PATH",
    "backend/models/crypto_scaler.joblib",
)

# Clave XOR en hex (puedes cambiarla en .env)
XOR_KEY_HEX = os.environ.get("XOR_KEY_HEX", "4b6579")  # "Key"
XOR_KEY = bytes.fromhex(XOR_KEY_HEX)

# =====================================
# Helpers de MongoDB (opcional)
# =====================================

def get_mongodb():
    global db, predictions_collection
    if not MONGO_AVAILABLE:
        return None

    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        print("MONGODB_URI no definido en entorno")
        return None

    if db is None:
        try:
            client = MongoClient(mongo_uri)
            db = client.get_database("crypto_classifier")
            predictions_collection = db.predictions
            return predictions_collection
        except Exception as e:
            print(f"MongoDB connection error: {e}")
            return None
    return predictions_collection

# =====================================
# Cargar modelo de cifrado al arrancar
# =====================================

def load_crypto_model():
    global model, scaler, model_trained
    try:
        print("DEBUG cwd =", os.getcwd())
        print("DEBUG MODEL_PATH =", CRYPTO_MODEL_PATH)
        print("DEBUG SCALER_PATH =", CRYPTO_SCALER_PATH)

        model = joblib.load(CRYPTO_MODEL_PATH)
        scaler = joblib.load(CRYPTO_SCALER_PATH)
        model_trained = True
        print("Crypto MLP model and scaler loaded successfully.")
    except Exception as e:
        print("Error loading crypto model:", repr(e))
        model_trained = False

load_crypto_model()

# =====================================
# Esquemas Pydantic
# =====================================

class CipherFeatures(BaseModel):
    longitud: float
    entropia: float
    freq_mayusculas: float
    freq_minusculas: float
    freq_numeros: float
    freq_espacios: float
    freq_especiales: float
    rango_ascii_min: float
    rango_ascii_max: float
    media_ascii: float
    varianza_ascii: float
    freq_char_top1: float
    freq_char_top2: float
    tiene_padding: float
    proporcion_alpha: float
    unique_chars: float
    ratio_unique: float

class CipherTextRequest(BaseModel):
    texto_cifrado: str

class CryptoPredictionResponse(BaseModel):
    prediction: int
    algorithm: str
    confidence: Optional[float] = None
    probabilities: Optional[Dict[str, float]] = None
    decoded_text: Optional[str] = None

class ModelStatus(BaseModel):
    trained: bool
    accuracy: Optional[float]
    message: str

class XorEncryptRequest(BaseModel):
    texto_claro: str

class XorEncryptResponse(BaseModel):
    texto_claro: str
    cipher_hex: str

ALGO_TYPES = {
    0: "Texto plano (sin cifrado)",
    1: "Caesar Cipher",
    2: "ROT13",
    3: "Base64",
    4: "XOR",
}

# =====================================
# Features del texto
# =====================================

def compute_features_from_text(text: str) -> Dict[str, float]:
    if not text:
        text = " "
    n = len(text)
    counts = Counter(text)

    longitud = n

    entropia = 0.0
    for c in counts.values():
        p = c / n
        entropia -= p * math.log2(p)

    mayus = sum(c.isupper() for c in text) / n
    minus = sum(c.islower() for c in text) / n
    nums = sum(c.isdigit() for c in text) / n
    espacios = text.count(" ") / n
    especiales = sum(
        1 for c in text if not (c.isalnum() or c.isspace())
    ) / n

    ascii_vals = [ord(c) for c in text]
    rango_min = float(min(ascii_vals))
    rango_max = float(max(ascii_vals))
    media_ascii = sum(ascii_vals) / n
    varianza_ascii = sum((v - media_ascii) ** 2 for v in ascii_vals) / n

    freqs_ordenadas = sorted(
        (c / n for c in counts.values()), reverse=True
    )
    freq_top1 = freqs_ordenadas[0] if freqs_ordenadas else 0.0
    freq_top2 = freqs_ordenadas[1] if len(freqs_ordenadas) > 1 else freq_top1

    tiene_padding = 1.0 if text.endswith("=") or text.endswith("==") else 0.0

    alpha = sum(c.isalpha() for c in text) / n
    unique_chars = len(counts)
    ratio_unique = unique_chars / n

    return {
        "longitud": float(longitud),
        "entropia": float(entropia),
        "freq_mayusculas": float(mayus),
        "freq_minusculas": float(minus),
        "freq_numeros": float(nums),
        "freq_espacios": float(espacios),
        "freq_especiales": float(especiales),
        "rango_ascii_min": float(rango_min),
        "rango_ascii_max": float(rango_max),
        "media_ascii": float(media_ascii),
        "varianza_ascii": float(varianza_ascii),
        "freq_char_top1": float(freq_top1),
        "freq_char_top2": float(freq_top2),
        "tiene_padding": float(tiene_padding),
        "proporcion_alpha": float(alpha),
        "unique_chars": float(unique_chars),
        "ratio_unique": float(ratio_unique),
    }

# =====================================
# Funciones de descifrado
# =====================================

def rot13_decode(text: str) -> str:
    result = []
    for ch in text:
        if "a" <= ch <= "z":
            result.append(chr((ord(ch) - ord("a") - 13) % 26 + ord("a")))
        elif "A" <= ch <= "Z":
            result.append(chr((ord(ch) - ord("A") - 13) % 26 + ord("A")))
        else:
            result.append(ch)
    return "".join(result)

SPANISH_COMMON_WORDS = {
    "el", "la", "los", "las", "de", "y", "que", "en", "un", "una",
    "es", "por", "para", "con", "no", "se", "al", "lo", "como",
    "mas", "más", "pero", "sus", "le", "ya", "o", "fue", "este",
    "ha", "si", "sí", "porque", "esta", "son", "entre", "cuando",
    "muy", "sin", "sobre", "tambien", "también", "me", "hasta",
    "hay", "donde", "dónde"
}

def caesar_decode(text: str, shift: int) -> str:
    result = []
    for ch in text:
        if "a" <= ch <= "z":
            base = ord("a")
            result.append(chr((ord(ch) - base - shift) % 26 + base))
        elif "A" <= ch <= "Z":
            base = ord("A")
            result.append(chr((ord(ch) - base - shift) % 26 + base))
        else:
            result.append(ch)
    return "".join(result)

def score_spanish_text(text: str) -> int:
    tokens = [
        t.strip(".,;:!?¡¿\"'()[]{}").lower()
        for t in text.split()
    ]
    score = 0
    for t in tokens:
        if t in SPANISH_COMMON_WORDS:
            score += 3
        elif len(t) > 4 and any(v in t for v in "aeiouáéíóú"):
            score += 1
    return score

def best_caesar_decode(text: str) -> str:
    best_text = text
    best_score = -1
    best_shift = 0

    for s in range(0, 26):
        candidate = caesar_decode(text, s)
        score = score_spanish_text(candidate)
        if score > best_score:
            best_score = score
            best_text = candidate
            best_shift = s

    print(f"[DEBUG] Mejor shift César encontrado: {best_shift}, score={best_score}")
    return best_text

def base64_decode_safe(text: str) -> str:
    try:
        decoded_bytes = base64.b64decode(text)
        return decoded_bytes.decode("utf-8", errors="replace")
    except Exception:
        return text

def xor_decrypt_from_hex(cipher_hex: str, key: bytes) -> str:
    try:
        data = bytes.fromhex(cipher_hex)
    except ValueError:
        return cipher_hex
    plain = bytes(
        b ^ key[i % len(key)]
        for i, b in enumerate(data)
    )
    return plain.decode("utf-8", errors="replace")

def xor_encrypt_to_hex(plain_text: str, key: bytes) -> str:
    data = plain_text.encode("utf-8")
    cipher = bytes(
        b ^ key[i % len(key)]
        for i, b in enumerate(data)
    )
    return cipher.hex()

# =====================================
# Endpoints
# =====================================

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Crypto Algorithm Classification API"}

@app.get("/api/model/status", response_model=ModelStatus)
async def get_model_status():
    return ModelStatus(
        trained=model_trained,
        accuracy=model_accuracy,
        message="Modelo cargado y listo" if model_trained else "Modelo no cargado",
    )

@app.get("/api/dataset/info")
async def get_dataset_info():
    return {
        "name": "Crypto Encryption Dataset",
        "description": (
            "Detección de algoritmos de cifrado (texto plano, Caesar, "
            "ROT13, Base64, XOR) usando 17 características estadísticas "
            "del texto cifrado."
        ),
        "n_samples": 10000,
        "n_features": 17,
        "feature_names": [
            "longitud",
            "entropia",
            "freq_mayusculas",
            "freq_minusculas",
            "freq_numeros",
            "freq_espacios",
            "freq_especiales",
            "rango_ascii_min",
            "rango_ascii_max",
            "media_ascii",
            "varianza_ascii",
            "freq_char_top1",
            "freq_char_top2",
            "tiene_padding",
            "proporcion_alpha",
            "unique_chars",
            "ratio_unique",
        ],
        "target_names": [
            "Texto plano (0)",
            "Caesar (1)",
            "ROT13 (2)",
            "Base64 (3)",
            "XOR (4)",
        ],
    }

@app.post("/api/crypto/predict", response_model=CryptoPredictionResponse)
async def predict_crypto(sample: CipherFeatures):
    global model, scaler, model_trained

    if not model_trained or model is None or scaler is None:
        raise fastapi.HTTPException(
            status_code=400,
            detail="Modelo de cifrado no cargado correctamente.",
        )

    try:
        input_data = np.array([[
            sample.longitud,
            sample.entropia,
            sample.freq_mayusculas,
            sample.freq_minusculas,
            sample.freq_numeros,
            sample.freq_espacios,
            sample.freq_especiales,
            sample.rango_ascii_min,
            sample.rango_ascii_max,
            sample.media_ascii,
            sample.varianza_ascii,
            sample.freq_char_top1,
            sample.freq_char_top2,
            sample.tiene_padding,
            sample.proporcion_alpha,
            sample.unique_chars,
            sample.ratio_unique,
        ]])

        input_scaled = scaler.transform(input_data)
        pred = int(model.predict(input_scaled)[0])

        probabilities = None
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(input_scaled)[0]
            probabilities = {
                ALGO_TYPES[i]: float(p) for i, p in enumerate(proba)
            }
            confidence = float(np.max(proba))

        collection = get_mongodb()
        if collection is not None:
            try:
                record = {
                    "type": "prediction",
                    "timestamp": datetime.utcnow().isoformat(),
                    "input": sample.model_dump(),
                    "prediction": pred,
                    "algorithm": ALGO_TYPES[pred],
                    "confidence": confidence,
                    "probabilities": probabilities,
                }
                collection.insert_one(record)
            except Exception as e:
                print(f"MongoDB prediction save error: {e}")

        return CryptoPredictionResponse(
            prediction=pred,
            algorithm=ALGO_TYPES[pred],
            confidence=confidence,
            probabilities=probabilities,
        )
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))

@app.post("/api/crypto/predict-text", response_model=CryptoPredictionResponse)
async def predict_crypto_from_text(payload: CipherTextRequest):
    if not model_trained or model is None or scaler is None:
        raise fastapi.HTTPException(
            status_code=400,
            detail="Modelo de cifrado no cargado correctamente.",
        )

    try:
        features = compute_features_from_text(payload.texto_cifrado)
        input_data = np.array([[
            features["longitud"],
            features["entropia"],
            features["freq_mayusculas"],
            features["freq_minusculas"],
            features["freq_numeros"],
            features["freq_espacios"],
            features["freq_especiales"],
            features["rango_ascii_min"],
            features["rango_ascii_max"],
            features["media_ascii"],
            features["varianza_ascii"],
            features["freq_char_top1"],
            features["freq_char_top2"],
            features["tiene_padding"],
            features["proporcion_alpha"],
            features["unique_chars"],
            features["ratio_unique"],
        ]])

        input_scaled = scaler.transform(input_data)
        pred = int(model.predict(input_scaled)[0])

        probabilities = None
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(input_scaled)[0]
            probabilities = {
                ALGO_TYPES[i]: float(p) for i, p in enumerate(proba)
            }
            confidence = float(np.max(proba))

        decoded_text = None
        if pred == 0:
            decoded_text = payload.texto_cifrado
        elif pred == 1:
            decoded_text = best_caesar_decode(payload.texto_cifrado)
        elif pred == 2:
            decoded_text = rot13_decode(payload.texto_cifrado)
        elif pred == 3:
            decoded_text = base64_decode_safe(payload.texto_cifrado)
        elif pred == 4:
            decoded_text = xor_decrypt_from_hex(payload.texto_cifrado, XOR_KEY)
        else:
            decoded_text = payload.texto_cifrado

        return CryptoPredictionResponse(
            prediction=pred,
            algorithm=ALGO_TYPES[pred],
            confidence=confidence,
            probabilities=probabilities,
            decoded_text=decoded_text,
        )
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))

# =====================================
# Endpoint para generar XOR desde texto claro
# =====================================

@app.post("/api/crypto/xor/encrypt", response_model=XorEncryptResponse)
async def xor_encrypt_endpoint(payload: XorEncryptRequest):
    cipher_hex = xor_encrypt_to_hex(payload.texto_claro, XOR_KEY)
    return XorEncryptResponse(
        texto_claro=payload.texto_claro,
        cipher_hex=cipher_hex,
    )
