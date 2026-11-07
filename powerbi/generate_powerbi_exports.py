"""
SentinelX — Reproducible Power BI CSV Export Generator & Validator

Reads:
  1. Authoritative Databricks evaluation exports:
     - src/data/final_benchmarks.csv
     - src/data/confusion_matrices.csv
  2. Original raw benchmark datasets (must be placed in datasets/ before running):
     - datasets/unsw-nb15/UNSW_NB15_training-set.parquet
     - datasets/unsw-nb15/UNSW_NB15_testing-set.parquet
     - datasets/nsl-kdd/KDDTrain+.txt
     - datasets/nsl-kdd/KDDTest+.txt

Generates and validates:
  - powerbi/powerbi_model_benchmarks.csv       (10 rows, 31 columns)
  - powerbi/powerbi_confusion_matrix_long.csv  (40 rows, 11 columns)
  - powerbi/powerbi_dataset_split_summary.csv  (4 rows, 13 columns)
  - powerbi/powerbi_attack_taxonomy.csv        (81 rows, 15 columns)
  - powerbi/powerbi_network_vectors.csv        (2,840 rows, 14 columns)
  - powerbi/powerbi_nslkdd_difficulty.csv      (44 rows, 10 columns)

Usage (from project root):
  python powerbi/generate_powerbi_exports.py
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
POWERBI_DIR = PROJECT_ROOT / "powerbi"

BENCHMARKS_CSV = PROJECT_ROOT / "src" / "data" / "final_benchmarks.csv"
CONFUSION_CSV = PROJECT_ROOT / "src" / "data" / "confusion_matrices.csv"

UNSW_TRAIN_PARQUET = PROJECT_ROOT / "datasets" / "unsw-nb15" / "UNSW_NB15_training-set.parquet"
UNSW_TEST_PARQUET = PROJECT_ROOT / "datasets" / "unsw-nb15" / "UNSW_NB15_testing-set.parquet"
KDD_TRAIN_TXT = PROJECT_ROOT / "datasets" / "nsl-kdd" / "KDDTrain+.txt"
KDD_TEST_TXT = PROJECT_ROOT / "datasets" / "nsl-kdd" / "KDDTest+.txt"

KDD_COLUMNS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes", "land",
    "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in", "num_compromised",
    "root_shell", "su_attempted", "num_root", "num_file_creations", "num_shells",
    "num_access_files", "num_outbound_cmds", "is_host_login", "is_guest_login", "count",
    "srv_count", "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",
    "same_srv_rate", "diff_srv_rate", "srv_diff_host_rate", "dst_host_count",
    "dst_host_srv_count", "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate", "dst_host_serror_rate",
    "dst_host_srv_serror_rate", "dst_host_rerror_rate", "dst_host_srv_rerror_rate",
    "label", "difficulty_level",
]


def calc_derived_metrics(row: pd.Series) -> pd.Series:
    """Compute confusion-matrix derived rates with safe division-by-zero guards."""
    tn = int(row["TN"])
    fp = int(row["FP"])
    fn = int(row["FN"])
    tp = int(row["TP"])
    total = tn + fp + fn + tp
    act_norm = tn + fp
    act_atk = fn + tp
    pred_norm = tn + fn
    pred_atk = tp + fp

    fpr = fp / act_norm if act_norm > 0 else 0.0
    fnr = fn / act_atk if act_atk > 0 else 0.0
    spec = tn / act_norm if act_norm > 0 else 0.0
    npv = tn / pred_norm if pred_norm > 0 else 0.0
    tpr = tp / act_atk if act_atk > 0 else 0.0
    bal_acc = (tpr + spec) / 2.0
    denom_sq = float(tp + fp) * float(tp + fn) * float(tn + fp) * float(tn + fn)
    mcc = (
        ((float(tp) * float(tn)) - (float(fp) * float(fn))) / math.sqrt(denom_sq)
        if denom_sq > 0.0
        else 0.0
    )
    err_rate = (fp + fn) / total if total > 0 else 0.0

    return pd.Series({
        "Test_Records": total,
        "Actual_Normal": act_norm,
        "Actual_Attack": act_atk,
        "Predicted_Normal": pred_norm,
        "Predicted_Attack": pred_atk,
        "FPR": round(fpr, 6),
        "FNR": round(fnr, 6),
        "Specificity": round(spec, 6),
        "NPV": round(npv, 6),
        "Balanced_Accuracy": round(bal_acc, 6),
        "MCC": round(mcc, 6),
        "Error_Rate": round(err_rate, 6),
    })


def main() -> int:
    required_files = [
        BENCHMARKS_CSV,
        CONFUSION_CSV,
        UNSW_TRAIN_PARQUET,
        UNSW_TEST_PARQUET,
        KDD_TRAIN_TXT,
        KDD_TEST_TXT,
    ]
    missing = [str(p.relative_to(PROJECT_ROOT)) for p in required_files if not p.is_file()]
    if missing:
        print("ERROR: Missing required input files:", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        print(
            "\nPlease place the raw UNSW-NB15 and NSL-KDD files in datasets/ as documented in README.md.",
            file=sys.stderr,
        )
        return 1

    POWERBI_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Model Benchmarks (10 rows)
    bench_df = pd.read_csv(BENCHMARKS_CSV)
    conf_df = pd.read_csv(CONFUSION_CSV).rename(columns={"dataset": "Dataset", "model": "Model"})
    merged = pd.merge(bench_df, conf_df, on=["Dataset", "Model"], how="inner", validate="one_to_one")
    assert len(merged) == 10, f"Expected 10 merged rows, got {len(merged)}"

    derived_cols = merged.apply(calc_derived_metrics, axis=1)
    for int_col in ["Test_Records", "Actual_Normal", "Actual_Attack", "Predicted_Normal", "Predicted_Attack"]:
        derived_cols[int_col] = derived_cols[int_col].astype(int)

    model_benchmarks = pd.concat([merged, derived_cols], axis=1)
    for metric, rank_col in [
        ("Accuracy", "Rank_Accuracy"),
        ("Weighted_F1", "Rank_Weighted_F1"),
        ("Attack_F1", "Rank_Attack_F1"),
        ("Attack_Recall", "Rank_Attack_Recall"),
        ("AUC_ROC", "Rank_AUC_ROC"),
    ]:
        model_benchmarks[rank_col] = (
            model_benchmarks.groupby("Dataset")[metric]
            .rank(ascending=False, method="min")
            .astype(int)
        )

    model_benchmarks = model_benchmarks.sort_values(["Dataset", "Rank_Weighted_F1"]).reset_index(drop=True)
    model_benchmarks.to_csv(POWERBI_DIR / "powerbi_model_benchmarks.csv", index=False)

    # 2. Confusion Matrix Long (40 rows)
    quad_meta = [
        ("TN", "True Negative", "Normal", "Normal", "Correct Classification"),
        ("FP", "False Positive", "Normal", "Attack", "Misclassification"),
        ("FN", "False Negative", "Attack", "Normal", "Misclassification"),
        ("TP", "True Positive", "Attack", "Attack", "Correct Classification"),
    ]
    long_rows = []
    for _, r in model_benchmarks.iterrows():
        total = int(r["Test_Records"])
        act_norm = int(r["Actual_Normal"])
        act_atk = int(r["Actual_Attack"])
        for q_code, q_name, act_cls, pred_cls, out_cat in quad_meta:
            cnt = int(r[q_code])
            cls_tot = act_norm if act_cls == "Normal" else act_atk
            long_rows.append({
                "Dataset": r["Dataset"],
                "Model": r["Model"],
                "Quadrant": q_code,
                "Quadrant_Name": q_name,
                "Actual_Class": act_cls,
                "Predicted_Class": pred_cls,
                "Outcome_Category": out_cat,
                "Record_Count": cnt,
                "Test_Set_Total": total,
                "Share_Of_Test_Set": round(cnt / total, 6) if total > 0 else 0.0,
                "Share_Of_Actual_Class": round(cnt / cls_tot, 6) if cls_tot > 0 else 0.0,
            })
    conf_long_df = pd.DataFrame(long_rows)
    conf_long_df.to_csv(POWERBI_DIR / "powerbi_confusion_matrix_long.csv", index=False)

    # 3. Load Raw Datasets & Build Dataset Split Summary (4 rows)
    u_tr = pd.read_parquet(UNSW_TRAIN_PARQUET)
    u_te = pd.read_parquet(UNSW_TEST_PARQUET)
    k_tr = pd.read_csv(KDD_TRAIN_TXT, names=KDD_COLUMNS)
    k_te = pd.read_csv(KDD_TEST_TXT, names=KDD_COLUMNS)

    split_rows = []
    for ds_name, split_name, src_file, df, is_unsw, feat_dim in [
        ("UNSW-NB15", "Train", "UNSW_NB15_training-set.parquet", u_tr, True, 171),
        ("UNSW-NB15", "Test", "UNSW_NB15_testing-set.parquet", u_te, True, 171),
        ("NSL-KDD", "Train", "KDDTrain+.txt", k_tr, False, 122),
        ("NSL-KDD", "Test", "KDDTest+.txt", k_te, False, 122),
    ]:
        tot = len(df)
        if is_unsw:
            norm = int((df["label"] == 0).sum())
            atk = int((df["label"] == 1).sum())
            subtypes = int(df.loc[df["label"] == 1, "attack_cat"].nunique())
        else:
            norm = int((df["label"] == "normal").sum())
            atk = int((df["label"] != "normal").sum())
            subtypes = int(df.loc[df["label"] != "normal", "label"].nunique())
        models_eval = 5 if split_name == "Test" else 0
        split_rows.append({
            "Dataset": ds_name,
            "Split": split_name,
            "Source_File": src_file,
            "Total_Records": tot,
            "Normal_Records": norm,
            "Attack_Records": atk,
            "Normal_Share": round(norm / tot, 6),
            "Attack_Share": round(atk / tot, 6),
            "Raw_Column_Count": int(df.shape[1]),
            "Engineered_Feature_Dim": feat_dim,
            "Distinct_Attack_Subtypes": subtypes,
            "Models_Evaluated_On_Split": models_eval,
            "Model_Record_Evaluations": tot * models_eval,
        })
    split_summary_df = pd.DataFrame(split_rows)
    split_summary_df.to_csv(POWERBI_DIR / "powerbi_dataset_split_summary.csv", index=False)

    # 4. Attack Taxonomy (81 rows)
    unsw_train_subtypes = set(u_tr["attack_cat"].astype(str).unique())
    kdd_train_subtypes = set(k_tr["label"].astype(str).unique())

    tax_rows = []
    for ds_name, split_name, df, is_unsw, train_set in [
        ("UNSW-NB15", "Train", u_tr, True, unsw_train_subtypes),
        ("UNSW-NB15", "Test", u_te, True, unsw_train_subtypes),
        ("NSL-KDD", "Train", k_tr, False, kdd_train_subtypes),
        ("NSL-KDD", "Test", k_te, False, kdd_train_subtypes),
    ]:
        split_tot = len(df)
        if is_unsw:
            w = pd.DataFrame({
                "Attack_Subtype": df["attack_cat"].astype(str),
                "Binary_Label": df["label"].astype(int),
                "dur": df["dur"].astype(float),
                "sbytes": df["sbytes"].astype(np.int64),
                "dbytes": df["dbytes"].astype(np.int64),
            })
        else:
            w = pd.DataFrame({
                "Attack_Subtype": df["label"].astype(str),
                "Binary_Label": (df["label"] != "normal").astype(int),
                "dur": df["duration"].astype(float),
                "sbytes": df["src_bytes"].astype(np.int64),
                "dbytes": df["dst_bytes"].astype(np.int64),
            })
        class_totals = w.groupby("Binary_Label")["Attack_Subtype"].count().to_dict()
        grp = w.groupby(["Attack_Subtype", "Binary_Label"], as_index=False).agg(
            Record_Count=("dur", "count"),
            Mean_Duration=("dur", "mean"),
            Mean_Src_Bytes=("sbytes", "mean"),
            Mean_Dst_Bytes=("dbytes", "mean"),
            Total_Src_Bytes=("sbytes", "sum"),
            Total_Dst_Bytes=("dbytes", "sum"),
        )
        for _, r in grp.iterrows():
            sub = str(r["Attack_Subtype"])
            blab = int(r["Binary_Label"])
            t_cls = "Normal" if blab == 0 else "Attack"
            unseen = bool(split_name == "Test" and blab == 1 and (sub not in train_set))
            cnt = int(r["Record_Count"])
            cls_tot = int(class_totals[blab])
            tax_rows.append({
                "Dataset": ds_name,
                "Split": split_name,
                "Attack_Subtype": sub,
                "Traffic_Class": t_cls,
                "Binary_Label": blab,
                "Unseen_In_Training": unseen,
                "Record_Count": cnt,
                "Split_Total_Records": split_tot,
                "Share_Of_Split": round(cnt / split_tot, 6),
                "Share_Of_Class_In_Split": round(cnt / cls_tot, 6) if cls_tot > 0 else 0.0,
                "Mean_Duration": round(float(r["Mean_Duration"]), 6),
                "Mean_Src_Bytes": round(float(r["Mean_Src_Bytes"]), 2),
                "Mean_Dst_Bytes": round(float(r["Mean_Dst_Bytes"]), 2),
                "Total_Src_Bytes": int(r["Total_Src_Bytes"]),
                "Total_Dst_Bytes": int(r["Total_Dst_Bytes"]),
            })

    tax_df = (
        pd.DataFrame(tax_rows)
        .sort_values(["Dataset", "Split", "Binary_Label", "Record_Count"], ascending=[True, True, True, False])
        .reset_index(drop=True)
    )
    tax_df.to_csv(POWERBI_DIR / "powerbi_attack_taxonomy.csv", index=False)

    # 5. Network Vectors (2,840 rows)
    vec_rows = []
    for ds_name, split_name, df, is_unsw in [
        ("UNSW-NB15", "Train", u_tr, True),
        ("UNSW-NB15", "Test", u_te, True),
        ("NSL-KDD", "Train", k_tr, False),
        ("NSL-KDD", "Test", k_te, False),
    ]:
        if is_unsw:
            w = pd.DataFrame({
                "Protocol": df["proto"].astype(str),
                "Service": df["service"].astype(str),
                "Connection_State": df["state"].astype(str),
                "Attack_Subtype": df["attack_cat"].astype(str),
                "Binary_Label": df["label"].astype(int),
                "dur": df["dur"].astype(float),
                "sbytes": df["sbytes"].astype(np.int64),
                "dbytes": df["dbytes"].astype(np.int64),
            })
        else:
            w = pd.DataFrame({
                "Protocol": df["protocol_type"].astype(str),
                "Service": df["service"].astype(str),
                "Connection_State": df["flag"].astype(str),
                "Attack_Subtype": df["label"].astype(str),
                "Binary_Label": (df["label"] != "normal").astype(int),
                "dur": df["duration"].astype(float),
                "sbytes": df["src_bytes"].astype(np.int64),
                "dbytes": df["dst_bytes"].astype(np.int64),
            })
        grp = w.groupby(
            ["Protocol", "Service", "Connection_State", "Attack_Subtype", "Binary_Label"],
            as_index=False,
        ).agg(
            Record_Count=("dur", "count"),
            Mean_Duration=("dur", "mean"),
            Total_Src_Bytes=("sbytes", "sum"),
            Total_Dst_Bytes=("dbytes", "sum"),
            Mean_Src_Bytes=("sbytes", "mean"),
            Mean_Dst_Bytes=("dbytes", "mean"),
        )
        for _, r in grp.iterrows():
            blab = int(r["Binary_Label"])
            vec_rows.append({
                "Dataset": ds_name,
                "Split": split_name,
                "Protocol": str(r["Protocol"]),
                "Service": str(r["Service"]),
                "Connection_State": str(r["Connection_State"]),
                "Attack_Subtype": str(r["Attack_Subtype"]),
                "Traffic_Class": "Normal" if blab == 0 else "Attack",
                "Binary_Label": blab,
                "Record_Count": int(r["Record_Count"]),
                "Mean_Duration": round(float(r["Mean_Duration"]), 6),
                "Total_Src_Bytes": int(r["Total_Src_Bytes"]),
                "Total_Dst_Bytes": int(r["Total_Dst_Bytes"]),
                "Mean_Src_Bytes": round(float(r["Mean_Src_Bytes"]), 2),
                "Mean_Dst_Bytes": round(float(r["Mean_Dst_Bytes"]), 2),
            })

    vec_df = (
        pd.DataFrame(vec_rows)
        .sort_values(["Dataset", "Split", "Record_Count"], ascending=[True, True, False])
        .reset_index(drop=True)
    )
    vec_df.to_csv(POWERBI_DIR / "powerbi_network_vectors.csv", index=False)

    # 6. NSL-KDD Difficulty Level (44 rows)
    diff_rows = []
    for split_name, df in [("Train", k_tr), ("Test", k_te)]:
        split_tot = len(df)
        for lvl in sorted(df["difficulty_level"].unique()):
            sub_df = df[df["difficulty_level"] == lvl]
            tot = len(sub_df)
            norm = int((sub_df["label"] == "normal").sum())
            atk = int((sub_df["label"] != "normal").sum())
            dist_atk = int(sub_df.loc[sub_df["label"] != "normal", "label"].nunique())
            diff_rows.append({
                "Dataset": "NSL-KDD",
                "Split": split_name,
                "Difficulty_Level": int(lvl),
                "Total_Records": tot,
                "Normal_Records": norm,
                "Attack_Records": atk,
                "Normal_Share_At_Level": round(norm / tot, 6) if tot > 0 else 0.0,
                "Attack_Share_At_Level": round(atk / tot, 6) if tot > 0 else 0.0,
                "Share_Of_Split_Total": round(tot / split_tot, 6) if split_tot > 0 else 0.0,
                "Distinct_Attack_Subtypes_At_Level": dist_atk,
            })
    diff_df = pd.DataFrame(diff_rows)
    diff_df.to_csv(POWERBI_DIR / "powerbi_nslkdd_difficulty.csv", index=False)

    # Validation checks
    assert split_summary_df["Total_Records"].sum() == 406190
    assert tax_df["Record_Count"].sum() == 406190
    assert vec_df["Record_Count"].sum() == 406190
    assert diff_df["Total_Records"].sum() == 148517
    assert conf_long_df["Record_Count"].sum() == 524380

    for fname in [
        "powerbi_model_benchmarks.csv",
        "powerbi_confusion_matrix_long.csv",
        "powerbi_dataset_split_summary.csv",
        "powerbi_attack_taxonomy.csv",
        "powerbi_network_vectors.csv",
        "powerbi_nslkdd_difficulty.csv",
    ]:
        fpath = POWERBI_DIR / fname
        print(f"Verified {fname}: {os.path.getsize(fpath):,} bytes")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
