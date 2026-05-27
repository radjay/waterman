#!/usr/bin/env python3
"""Train bay-wind-v3-ml models from exported JSONL rows."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.tree import _tree

try:
    import lightgbm as lgb

    HAS_LIGHTGBM = True
except OSError:
    HAS_LIGHTGBM = False

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data" / "forecast-experiment" / "ml-training"
OUTPUT_PATH = REPO_ROOT / "data" / "forecast-experiment" / "bay-wind-v3-model.json"
FEATURE_HOURS = list(range(6, 22))
THRESHOLD_KNOTS_PRESETS = [10, 12, 15]
DEFAULT_HOLDOUT_YEAR = 2025


def load_rows() -> tuple[pd.DataFrame, list[str]]:
    all_path = DATA_DIR / "all.jsonl"
    if not all_path.exists():
        print(f"Missing {all_path}. Run: npm run fx:export:ml-dataset -- --all-presets", file=sys.stderr)
        sys.exit(1)

    rows = []
    with all_path.open() as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))

    if not rows:
        print("No training rows found.", file=sys.stderr)
        sys.exit(1)

    feature_names = list(rows[0]["features"].keys())
    records = []
    for row in rows:
        record = {name: row["features"][name] for name in feature_names}
        record["dateLocal"] = row["dateLocal"]
        record["summerYear"] = row["summerYear"]
        record["thresholdKnots"] = row["thresholdKnots"]
        record["actualKickInMinutes"] = row.get("actualKickInMinutes")
        record["labelStatus"] = row.get("labelStatus")
        for hour in FEATURE_HOURS:
            record[f"h{hour}Rideable"] = row.get("hourlyRideable", {}).get(f"h{hour}Rideable", 0)
        records.append(record)

    return pd.DataFrame(records), feature_names


def leave_one_summer_mae(y_true, y_pred, years) -> dict[str, float]:
    scores: dict[str, float] = {}
    for year in sorted(set(years)):
        mask = years == year
        if mask.sum() < 5:
            continue
        scores[str(int(year))] = round(float(mean_absolute_error(y_true[mask], y_pred[mask])), 1)
    return scores


def sklearn_tree_to_json(tree, feature_names: list[str]) -> dict:
    def walk(node_id: int) -> dict:
        if tree.feature[node_id] == _tree.TREE_UNDEFINED:
            return {"leaf_value": float(tree.value[node_id][0][0])}
        feature = feature_names[tree.feature[node_id]]
        return {
            "split_feature": feature,
            "threshold": float(tree.threshold[node_id]),
            "decision_type": "<=",
            "default_left": True,
            "left_child": walk(tree.children_left[node_id]),
            "right_child": walk(tree.children_right[node_id]),
        }

    return {"tree_info": [{"tree_index": 0, "tree_structure": walk(0)}]}


def scale_tree_leaves(node: dict, factor: float) -> dict:
    if "leaf_value" in node:
        return {"leaf_value": float(node["leaf_value"]) * factor}
    return {
        **{key: node[key] for key in node if key not in ("left_child", "right_child", "leaf_value")},
        "left_child": scale_tree_leaves(node["left_child"], factor),
        "right_child": scale_tree_leaves(node["right_child"], factor),
    }


def read_regressor_init_score(model) -> float:
    init_attr = getattr(model, "init_", 0.0)
    if hasattr(init_attr, "constant_"):
        value = init_attr.constant_
        while hasattr(value, "__len__") and not isinstance(value, (str, bytes)):
            value = value[0]
        return float(value)
    return float(init_attr)


def read_classifier_init_score(model) -> float:
    init_attr = getattr(model, "init_", None)
    if init_attr is not None and hasattr(init_attr, "class_prior_"):
        prior = float(init_attr.class_prior_[1])
        prior = min(max(prior, 1e-6), 1 - 1e-6)
        return float(np.log(prior / (1 - prior)))
    return 0.0


def sklearn_gbr_to_json(model, feature_names: list[str], *, classifier: bool = False) -> dict:
    learning_rate = float(getattr(model, "learning_rate", 1.0))
    init_score = read_classifier_init_score(model) if classifier else read_regressor_init_score(model)
    trees = []
    for index, estimator in enumerate(model.estimators_.ravel()):
        tree = estimator.tree_
        node = sklearn_tree_to_json(tree, feature_names)["tree_info"][0]["tree_structure"]
        trees.append({"tree_index": index, "tree_structure": scale_tree_leaves(node, learning_rate)})
    return {
        "feature_names": feature_names,
        "init_score": init_score,
        "tree_info": trees,
    }


def predict_gbm_json(model_json: dict, row: pd.Series, feature_names: list[str]) -> float:
    features = {name: float(row[name]) for name in feature_names}

    def traverse(node: dict) -> float:
        if "leaf_value" in node:
            return float(node["leaf_value"])
        value = features.get(node["split_feature"], 0.0)
        threshold = float(node.get("threshold", 0))
        child = node["left_child"] if value <= threshold else node["right_child"]
        return traverse(child)

    score = float(model_json.get("init_score", 0))
    for tree in model_json.get("tree_info", []):
        score += traverse(tree["tree_structure"])
    return score


def predict_binary(model_json: dict, row: pd.Series, feature_names: list[str]) -> float:
    raw = predict_gbm_json(model_json, row, feature_names)
    return float(1 / (1 + np.exp(-raw)))


def simulate_day_prediction(
    row: pd.Series,
    feature_names: list[str],
    kick_in_model: dict,
    session_model: dict | None,
    hourly_models: dict[str, dict],
    *,
    session_threshold: float,
    kick_in_threshold: float,
    probability_damping: float,
    use_kick_in_regressor: bool,
) -> tuple[bool, float | None]:
    if session_model is not None:
        session_prob = predict_binary(session_model, row, feature_names)
        if session_prob < session_threshold:
            return False, None

    kick_in_minutes = None
    if use_kick_in_regressor:
        kick_in_minutes = max(0.0, predict_gbm_json(kick_in_model, row, feature_names))

    max_prob = 0.0
    first_hour = None
    for hour in FEATURE_HOURS:
        hour_model = hourly_models.get(f"h{hour}")
        if hour_model:
            prob = predict_binary(hour_model, row, feature_names)
        else:
            effective = float(row.get(f"icon7_h{hour}_effective", 0))
            threshold = float(row.get("thresholdKnots", 12))
            prob = float(1 / (1 + np.exp(-(effective - threshold) / 2)))
        prob = min(0.97, max(0.03, prob * probability_damping))
        if prob >= kick_in_threshold and first_hour is None:
            first_hour = hour
        max_prob = max(max_prob, prob)

    if first_hour is None and max_prob < kick_in_threshold:
        return False, None

    if kick_in_minutes is not None and np.isfinite(kick_in_minutes):
        return True, float(kick_in_minutes)

    if first_hour is not None:
        return True, float(first_hour * 60)

    return False, None


def evaluate_calibration(
    holdout: pd.DataFrame,
    feature_names: list[str],
    kick_in_model: dict,
    session_model: dict | None,
    hourly_models: dict[str, dict],
    *,
    session_threshold: float,
    kick_in_threshold: float,
    probability_damping: float,
) -> dict[str, float]:
    tp = fp = fn = 0
    errors: list[float] = []

    for _, row in holdout.iterrows():
        observed = pd.notna(row["actualKickInMinutes"])
        predicted_rideable, predicted_minutes = simulate_day_prediction(
            row,
            feature_names,
            kick_in_model,
            session_model,
            hourly_models,
            session_threshold=session_threshold,
            kick_in_threshold=kick_in_threshold,
            probability_damping=probability_damping,
            use_kick_in_regressor=True,
        )

        if predicted_rideable and observed:
            tp += 1
            errors.append(abs(float(predicted_minutes) - float(row["actualKickInMinutes"])))
        elif predicted_rideable and not observed:
            fp += 1
        elif not predicted_rideable and observed:
            fn += 1

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    mae = float(np.mean(errors)) if errors else float("nan")
    return {
        "falsePositiveCount": float(fp),
        "falseNegativeCount": float(fn),
        "precision": precision,
        "recall": recall,
        "maeMinutes": mae,
        "score": fp * 2 + fn + (mae / 120 if np.isfinite(mae) else 0),
    }


def optimize_calibration(
    holdout: pd.DataFrame,
    feature_names: list[str],
    kick_in_model: dict,
    session_model: dict | None,
    hourly_models: dict[str, dict],
) -> dict:
    if holdout.empty:
        return {
            "sessionThreshold": 0.55,
            "kickInThreshold": 0.6,
            "probabilityDamping": 0.85,
            "holdoutSampleCount": 0,
        }

    best = None
    best_params = {
        "sessionThreshold": 0.55,
        "kickInThreshold": 0.6,
        "probabilityDamping": 0.85,
    }

    # Phase 1 / Phase 2 note: Post-training threshold bumps on holdout artifacts
    # (0.60 / 0.70) produced no reduction in real backtest FP (still 52 on 2025 self).
    # Therefore we bias the search toward more conservative session gates by default
    # for the day-ahead Forecast layer. Future retrains will naturally prefer higher
    # sessionThreshold values. (Can still be overridden per use-case for Nowcast.)
    for session_threshold in np.arange(0.50, 0.81, 0.05):
        for kick_in_threshold in np.arange(0.5, 0.86, 0.05):
            for probability_damping in (0.75, 0.85, 0.95, 1.0):
                metrics = evaluate_calibration(
                    holdout,
                    feature_names,
                    kick_in_model,
                    session_model,
                    hourly_models,
                    session_threshold=float(session_threshold),
                    kick_in_threshold=float(kick_in_threshold),
                    probability_damping=float(probability_damping),
                )
                if best is None or metrics["score"] < best["score"]:
                    best = metrics
                    best_params = {
                        "sessionThreshold": round(float(session_threshold), 2),
                        "kickInThreshold": round(float(kick_in_threshold), 2),
                        "probabilityDamping": round(float(probability_damping), 2),
                        "holdoutSampleCount": int(len(holdout)),
                        "holdoutPrecision": round(metrics["precision"], 3),
                        "holdoutRecall": round(metrics["recall"], 3),
                        "holdoutFalsePositiveCount": int(metrics["falsePositiveCount"]),
                        "holdoutFalseNegativeCount": int(metrics["falseNegativeCount"]),
                        "holdoutMaeMinutes": round(metrics["maeMinutes"], 1)
                        if np.isfinite(metrics["maeMinutes"])
                        else None,
                    }

    return best_params


def train_kick_in_regressor(df: pd.DataFrame, feature_names: list[str]) -> tuple[dict, dict, str]:
    labeled = df[df["actualKickInMinutes"].notna()].copy()
    if labeled.empty:
        raise RuntimeError("No kick-in labels available for training")

    X = labeled[feature_names]
    y = labeled["actualKickInMinutes"].astype(float)
    years = labeled["summerYear"].astype(int).to_numpy()

    if HAS_LIGHTGBM:
        params = {
            "objective": "regression",
            "metric": "mae",
            "learning_rate": 0.05,
            "num_leaves": 31,
            "min_data_in_leaf": 8,
            "feature_fraction": 0.9,
            "bagging_fraction": 0.8,
            "bagging_freq": 1,
            "verbose": -1,
        }
        train_set = lgb.Dataset(X, label=y, feature_name=feature_names)
        booster = lgb.train(params, train_set, num_boost_round=120)
        model_json = json.loads(booster.model_to_json())
        preds = booster.predict(X)
        backend = "lightgbm"
    else:
        model = GradientBoostingRegressor(
            random_state=42,
            learning_rate=0.05,
            n_estimators=120,
            max_depth=4,
            min_samples_leaf=8,
        )
        model.fit(X, y)
        model_json = sklearn_gbr_to_json(model, feature_names)
        preds = model.predict(X)
        backend = "sklearn-gbr"

    cv_scores = leave_one_summer_mae(y.to_numpy(), preds, years)
    return model_json, cv_scores, backend


def train_rideable_day_classifier(df: pd.DataFrame, feature_names: list[str]) -> tuple[dict | None, str]:
    labeled = df.copy()
    labeled["rideableDay"] = labeled["actualKickInMinutes"].notna().astype(int)
    if labeled["rideableDay"].nunique() < 2:
        return None, "skipped"

    X = labeled[feature_names]
    y = labeled["rideableDay"].astype(int)

    if HAS_LIGHTGBM:
        params = {
            "objective": "binary",
            "metric": "binary_logloss",
            "learning_rate": 0.05,
            "num_leaves": 15,
            "min_data_in_leaf": 10,
            "feature_fraction": 0.9,
            "verbose": -1,
            # Phase 1 recal: down-weight positive class to reduce false positives
            # in the real pipeline (post-hoc thresholds and modest grid shifts
            # were insufficient on holdout models).
            "scale_pos_weight": 0.7,
        }
        train_set = lgb.Dataset(X, label=y, feature_name=feature_names)
        booster = lgb.train(params, train_set, num_boost_round=80)
        model_json = json.loads(booster.model_to_json())
        backend = "lightgbm"
    else:
        # Down-weight positive class via sample_weight (GradientBoostingClassifier
        # does not support class_weight; this is the supported equivalent).
        sample_weight = np.where(y == 1, 0.7, 1.0)
        model = GradientBoostingClassifier(
            random_state=42,
            learning_rate=0.05,
            n_estimators=80,
            max_depth=3,
            min_samples_leaf=10,
        )
        model.fit(X, y, sample_weight=sample_weight)
        model_json = sklearn_gbr_to_json(model, feature_names, classifier=True)
        backend = "sklearn-gbc"

    return model_json, backend


def train_hourly_classifiers(df: pd.DataFrame, feature_names: list[str]) -> tuple[dict[str, dict], dict, str]:
    boosters: dict[str, dict] = {}
    cv_scores: dict[str, float] = {}
    backend = "lightgbm" if HAS_LIGHTGBM else "sklearn-gbc"

    for hour in FEATURE_HOURS:
        label_col = f"h{hour}Rideable"
        labeled = df[df[label_col].notna()].copy()
        if labeled.empty:
            continue

        X = labeled[feature_names]
        y = labeled[label_col].astype(int)
        if y.nunique() < 2:
            continue

        if HAS_LIGHTGBM:
            params = {
                "objective": "binary",
                "metric": "binary_logloss",
                "learning_rate": 0.05,
                "num_leaves": 15,
                "min_data_in_leaf": 10,
                "feature_fraction": 0.9,
                "verbose": -1,
                # Phase 1 recal: down-weight positive class on hourly models too
                # (these drive the probability timeline and are a major source of
                # real-pipeline false positives on holdout models).
                "scale_pos_weight": 0.7,
            }
            train_set = lgb.Dataset(X, label=y, feature_name=feature_names)
            booster = lgb.train(params, train_set, num_boost_round=80)
            model_json = json.loads(booster.model_to_json())
            preds = booster.predict(X)
        else:
            # Down-weight positive class via sample_weight (GradientBoostingClassifier
            # does not support class_weight).
            sample_weight = np.where(y == 1, 0.7, 1.0)
            model = GradientBoostingClassifier(
                random_state=42,
                learning_rate=0.05,
                n_estimators=80,
                max_depth=3,
                min_samples_leaf=10,
            )
            model.fit(X, y, sample_weight=sample_weight)
            model_json = sklearn_gbr_to_json(model, feature_names, classifier=True)
            raw = model.decision_function(X)
            preds = 1 / (1 + np.exp(-raw))

        boosters[f"h{hour}"] = model_json
        cv_scores[f"h{hour}"] = round(float(np.mean((preds >= 0.5) == y)), 3)

    return boosters, cv_scores, backend


def build_calibration(
    df: pd.DataFrame,
    feature_names: list[str],
    kick_in_model: dict,
    session_model: dict | None,
    hourly_models: dict[str, dict],
    *,
    holdout_year: int,
) -> dict:
    by_threshold: dict[str, dict] = {}
    holdout_all = df[df["summerYear"] == holdout_year]

    for threshold in THRESHOLD_KNOTS_PRESETS:
        holdout = holdout_all[holdout_all["thresholdKnots"] == threshold]
        tuned = optimize_calibration(
            holdout,
            feature_names,
            kick_in_model,
            session_model,
            hourly_models,
        )
        by_threshold[str(threshold)] = tuned

    return {
        "holdoutYear": holdout_year,
        "byThresholdKnots": by_threshold,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train bay-wind-v3 ML artifact")
    parser.add_argument(
        "--holdout-year",
        type=int,
        default=DEFAULT_HOLDOUT_YEAR,
        help="Summer year held out for calibration tuning (default: 2025)",
    )
    parser.add_argument(
        "--model-out",
        type=str,
        default=None,
        help="Optional path to write the trained model JSON (default: data/forecast-experiment/bay-wind-v3-model.json)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not HAS_LIGHTGBM:
        print("LightGBM unavailable (missing libomp) — using scikit-learn gradient boosting.", file=sys.stderr)

    df, feature_names = load_rows()
    print(f"Loaded {len(df)} rows, {df['actualKickInMinutes'].notna().sum()} kick-in labels")

    kick_in_model, kick_in_cv, kick_in_backend = train_kick_in_regressor(df, feature_names)
    session_model, session_backend = train_rideable_day_classifier(df, feature_names)
    hourly_models, hourly_cv, hourly_backend = train_hourly_classifiers(df, feature_names)

    calibration = build_calibration(
        df,
        feature_names,
        kick_in_model,
        session_model,
        hourly_models,
        holdout_year=args.holdout_year,
    )

    artifact = {
        "version": 2,
        "modelVersion": "bay-wind-v3.5-ml",
        "featureNames": feature_names,
        "featureHours": FEATURE_HOURS,
        "kickInRegressor": kick_in_model,
        "rideableDayClassifier": session_model,
        "hourlyRideableClassifiers": hourly_models,
        "calibration": calibration,
        "trainingMeta": {
            "rowCount": int(len(df)),
            "labeledKickInCount": int(df["actualKickInMinutes"].notna().sum()),
            "kickInLeaveOneSummerMaeMinutes": kick_in_cv,
            "hourlyRideableAccuracy": hourly_cv,
            "backend": {
                "kickIn": kick_in_backend,
                "session": session_backend,
                "hourly": hourly_backend,
            },
        },
    }

    out_path = Path(args.model_out) if args.model_out else OUTPUT_PATH
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"Wrote {out_path}")
    if kick_in_cv:
        print("Kick-in leave-one-summer MAE (minutes):", kick_in_cv)
    print("Calibration by threshold (kt):", json.dumps(calibration["byThresholdKnots"], indent=2))


if __name__ == "__main__":
    main()
