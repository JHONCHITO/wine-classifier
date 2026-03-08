import os
import json
from datetime import datetime
from typing import Optional, List, Dict

import numpy as np
import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

from dotenv import load_dotenv  # ← NUEVO

# Cargar variables de entorno desde .env
load_dotenv()  # ← NUEVO

print("DEBUG MONGODB_URI =", os.environ.get("MONGODB_URI"))

# Try to import pymongo for MongoDB
try:
    from pymongo import MongoClient
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False

app = fastapi.FastAPI(title="Wine Classification API", version="1.0.0")

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and scaler
model: Optional[MLPClassifier] = None
scaler: Optional[StandardScaler] = None
model_accuracy: Optional[float] = None
model_trained: bool = False

# MongoDB connection
db = None
predictions_collection = None


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
            db = client.get_database("wine_classifier")
            predictions_collection = db.predictions
            return predictions_collection
        except Exception as e:
            print(f"MongoDB connection error: {e}")
            return None
    return predictions_collection


# Pydantic models
class WineSample(BaseModel):
    alcohol: float
    malic_acid: float
    ash: float
    alcalinity_of_ash: float
    magnesium: float
    total_phenols: float
    flavanoids: float
    nonflavanoid_phenols: float
    proanthocyanins: float
    color_intensity: float
    hue: float
    od280_od315: float
    proline: float


class TrainingConfig(BaseModel):
    hidden_layers: List[int] = [10]
    activation: str = "relu"
    solver: str = "adam"
    max_iter: int = 500
    alpha: float = 0.0001
    test_size: float = 0.3


class PredictionResponse(BaseModel):
    prediction: int
    wine_type: str
    confidence: Optional[float] = None
    probabilities: Optional[Dict[str, float]] = None


class TrainingResponse(BaseModel):
    accuracy: float
    confusion_matrix: list
    classification_report: dict
    message: str


class ModelStatus(BaseModel):
    trained: bool
    accuracy: Optional[float]
    message: str


# Wine type mapping (alta / media / baja)
WINE_TYPES = {
    1: "Vino de alta calidad (Clase 1)",
    2: "Vino de calidad media (Clase 2)",
    3: "Vino de baja calidad (Clase 3)",
}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Wine Classification API"}


@app.get("/api/model/status")
async def get_model_status():
    return ModelStatus(
        trained=model_trained,
        accuracy=model_accuracy,
        message="Modelo entrenado y listo" if model_trained else "Modelo no entrenado",
    )


@app.get("/api/dataset/info")
async def get_dataset_info():
    wine_data = load_wine()
    return {
        "name": "Wine Dataset",
        "description": "Dataset de clasificación de vinos con 178 muestras y 13 características químicas",
        "n_samples": wine_data.data.shape[0],
        "n_features": wine_data.data.shape[1],
        "feature_names": wine_data.feature_names,
        "target_names": [
            "Vino de alta calidad (Clase 1)",
            "Vino de calidad media (Clase 2)",
            "Vino de baja calidad (Clase 3)",
        ],
        "class_distribution": {
            "Clase 1": int(np.sum(wine_data.target == 0)),
            "Clase 2": int(np.sum(wine_data.target == 1)),
            "Clase 3": int(np.sum(wine_data.target == 2)),
        },
    }


@app.get("/api/dataset/sample")
async def get_sample_data():
    wine_data = load_wine()
    X = wine_data.data
    y = wine_data.target  # 0,1,2

    samples = []
    # Tomar una muestra representativa de cada clase 0,1,2
    for class_idx in [0, 1, 2]:
        indices = np.where(y == class_idx)[0]
        if len(indices) == 0:
            continue
        i = int(indices[0])
        sample = {name: float(X[i][j]) for j, name in enumerate(wine_data.feature_names)}
        sample["class"] = int(class_idx + 1)
        sample["wine_type"] = WINE_TYPES[class_idx + 1]
        samples.append(sample)

    return {"samples": samples}


@app.post("/api/model/train")
async def train_model(config: TrainingConfig = TrainingConfig()):
    global model, scaler, model_accuracy, model_trained

    try:
        # Load dataset
        wine_data = load_wine()
        X = wine_data.data
        y = wine_data.target + 1  # Classes 1, 2, 3

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=config.test_size, random_state=42, stratify=y
        )

        # Scale data
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Create and train model
        model = MLPClassifier(
            hidden_layer_sizes=tuple(config.hidden_layers),
            activation=config.activation,
            solver=config.solver,
            max_iter=config.max_iter,
            alpha=config.alpha,
            random_state=42,
        )

        model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        conf_matrix = confusion_matrix(y_test, y_pred).tolist()

        # Get classification report as dict
        report = classification_report(y_test, y_pred, output_dict=True)

        model_accuracy = accuracy
        model_trained = True

        # Save training to MongoDB
        collection = get_mongodb()
        if collection is not None:
            try:
                training_record = {
                    "type": "training",
                    "timestamp": datetime.utcnow().isoformat(),
                    "config": config.model_dump(),
                    "accuracy": accuracy,
                    "confusion_matrix": conf_matrix,
                }
                collection.insert_one(training_record)
            except Exception as e:
                print(f"MongoDB training save error: {e}")

        return TrainingResponse(
            accuracy=accuracy,
            confusion_matrix=conf_matrix,
            classification_report=report,
            message=f"Modelo entrenado exitosamente con exactitud de {accuracy*100:.2f}%",
        )

    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict")
async def predict(sample: WineSample):
    global model, scaler, model_trained

    if not model_trained:
        raise fastapi.HTTPException(
            status_code=400,
            detail="Modelo no entrenado. Por favor entrene el modelo primero.",
        )

    try:
        # Prepare input data
        input_data = np.array(
            [
                [
                    sample.alcohol,
                    sample.malic_acid,
                    sample.ash,
                    sample.alcalinity_of_ash,
                    sample.magnesium,
                    sample.total_phenols,
                    sample.flavanoids,
                    sample.nonflavanoid_phenols,
                    sample.proanthocyanins,
                    sample.color_intensity,
                    sample.hue,
                    sample.od280_od315,
                    sample.proline,
                ]
            ]
        )

        # Scale input
        input_scaled = scaler.transform(input_data)

        # Predict
        prediction = int(model.predict(input_scaled)[0])

        # Get probabilities if available
        probabilities = None
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(input_scaled)[0]
            probabilities = {
                "Clase 1": float(proba[0]),
                "Clase 2": float(proba[1]),
                "Clase 3": float(proba[2]),
            }
            confidence = float(max(proba))

        # Save prediction to MongoDB
        collection = get_mongodb()
        if collection is not None:
            try:
                prediction_record = {
                    "type": "prediction",
                    "timestamp": datetime.utcnow().isoformat(),
                    "input": sample.model_dump(),
                    "prediction": prediction,
                    "wine_type": WINE_TYPES[prediction],
                    "confidence": confidence,
                    "probabilities": probabilities,
                }
                collection.insert_one(prediction_record)
            except Exception as e:
                print(f"MongoDB prediction save error: {e}")

        return PredictionResponse(
            prediction=prediction,
            wine_type=WINE_TYPES[prediction],
            confidence=confidence,
            probabilities=probabilities,
        )

    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))


@app.get("/api/predictions/history")
async def get_predictions_history(limit: int = 20):
    collection = get_mongodb()
    if collection is not None:
        try:
            predictions = list(
                collection.find({"type": "prediction"})
                .sort("timestamp", -1)
                .limit(limit)
            )
            # Convert ObjectId to string
            for pred in predictions:
                pred["_id"] = str(pred["_id"])
            return {"predictions": predictions, "count": len(predictions)}
        except Exception as e:
            return {"predictions": [], "count": 0, "error": str(e)}
    return {"predictions": [], "count": 0, "message": "MongoDB no configurado"}


@app.get("/api/training/history")
async def get_training_history(limit: int = 10):
    collection = get_mongodb()
    if collection is not None:
        try:
            trainings = list(
                collection.find({"type": "training"})
                .sort("timestamp", -1)
                .limit(limit)
            )
            for train in trainings:
                train["_id"] = str(train["_id"])
            return {"trainings": trainings, "count": len(trainings)}
        except Exception as e:
            return {"trainings": [], "count": 0, "error": str(e)}
    return {"trainings": [], "count": 0, "message": "MongoDB no configurado"}


@app.delete("/api/predictions/clear")
async def clear_predictions():
    collection = get_mongodb()
    if collection is not None:
        try:
            result = collection.delete_many({"type": "prediction"})
            return {"message": f"Se eliminaron {result.deleted_count} predicciones"}
        except Exception as e:
            raise fastapi.HTTPException(status_code=500, detail=str(e))
    return {"message": "MongoDB no configurado"}


@app.get("/api/model/iterations")
async def run_iterations():
    """Run all iterations and return comparison results"""
    global model, scaler, model_accuracy, model_trained

    wine_data = load_wine()
    X = wine_data.data
    y = wine_data.target + 1

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    iterations = [
        {
            "name": "Base",
            "config": {
                "hidden_layer_sizes": (5,),
                "activation": "relu",
                "solver": "adam",
                "max_iter": 500,
            },
        },
        {
            "name": "Iteración 1",
            "config": {
                "hidden_layer_sizes": (10,),
                "activation": "relu",
                "solver": "adam",
                "max_iter": 500,
            },
        },
        {
            "name": "Iteración 2",
            "config": {
                "hidden_layer_sizes": (10, 5),
                "activation": "relu",
                "solver": "adam",
                "max_iter": 500,
            },
        },
        {
            "name": "Iteración 3",
            "config": {
                "hidden_layer_sizes": (10, 5),
                "activation": "tanh",
                "solver": "adam",
                "max_iter": 500,
            },
        },
        {
            "name": "Iteración 4",
            "config": {
                "hidden_layer_sizes": (10, 5),
                "activation": "tanh",
                "solver": "adam",
                "alpha": 0.01,
                "max_iter": 500,
            },
        },
        {
            "name": "Iteración 5",
            "config": {
                "hidden_layer_sizes": (20, 10),
                "activation": "relu",
                "solver": "adam",
                "alpha": 0.0005,
                "learning_rate_init": 0.001,
                "early_stopping": False,
                "max_iter": 1000,
            },
        },
    ]

    results = []
    best_accuracy = 0.0
    best_model = None

    for iteration in iterations:
        mlp = MLPClassifier(random_state=42, **iteration["config"])
        mlp.fit(X_train_scaled, y_train)
        y_pred = mlp.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        conf_matrix = confusion_matrix(y_test, y_pred).tolist()

        results.append(
            {
                "name": iteration["name"],
                "config": {
                    k: str(v)
                    if not isinstance(v, (int, float, bool))
                    else v
                    for k, v in iteration["config"].items()
                },
                "accuracy": accuracy,
                "confusion_matrix": conf_matrix,
            }
        )

        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_model = mlp

    # Set the best model as the active model
    model = best_model
    model_accuracy = best_accuracy
    model_trained = True

    best_entry = max(results, key=lambda r: r["accuracy"])
    best_name = best_entry["name"]

    # (Opcional) guardar corrida de iteraciones en MongoDB
    collection = get_mongodb()
    if collection is not None:
        try:
            collection.insert_one(
                {
                    "type": "iterations_run",
                    "timestamp": datetime.utcnow().isoformat(),
                    "results": results,
                    "best_model": {
                        "name": best_name,
                        "accuracy": best_accuracy,
                    },
                }
            )
        except Exception as e:
            print(f"MongoDB iterations save error: {e}")

    return {
        "results": results,
        "best_model": {
            "name": best_name,
            "accuracy": best_accuracy,
        },
        "message": f"Mejor modelo: {best_name} con exactitud {best_accuracy*100:.2f}%",
    }
