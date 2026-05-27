# Bay wind v3 ML trainer

Trains `bay-wind-v3-ml` kick-in regressor and hourly rideable classifiers from exported JSONL rows.

## Setup

```bash
cd ml/bay-wind
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Export training data (from repo root)

```bash
npm run fx:export:ml-dataset -- --all-presets
```

Writes `data/forecast-experiment/ml-training/*.jsonl`.

## Train

```bash
python3.12 train.py
```

Uses LightGBM when `libomp` is installed; otherwise falls back to scikit-learn gradient boosting with the same JSON tree export consumed by Node.

Outputs `data/forecast-experiment/bay-wind-v3-model.json`.

## Model format tradeoff

We export **LightGBM JSON** (native `save_model`) rather than ONNX:

- **Pros:** No extra Node runtime dependency; human-readable trees; fast training on M3 Max CPU.
- **Cons:** Node inference uses a small custom tree walker (`lib/forecast-experiment/bayWindPredictionMl.js`) instead of a battle-tested ONNX runtime.

ONNX would add `onnxruntime-node` and conversion steps for marginal gain on this ~5k-row dataset.

## Leave-one-summer-out

Training logs MAE per held-out summer (2024 / 2025 / 2026) using rows grouped by `summerYear`.
