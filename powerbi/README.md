# SentinelX Power BI Data Exports & Dashboard Guide

This directory contains six verified CSV datasets and documentation for building the **SentinelX** 4-page Power BI Dashboard. Every table is derived strictly from the authoritative Databricks evaluation exports (`src/data/final_benchmarks.csv` and `src/data/confusion_matrices.csv`) and the four original benchmark dataset files (`datasets/unsw-nb15/UNSW_NB15_training-set.parquet`, `datasets/unsw-nb15/UNSW_NB15_testing-set.parquet`, `datasets/nsl-kdd/KDDTrain+.txt`, and `datasets/nsl-kdd/KDDTest+.txt`).

---

## 1. Overview of Generated CSV Files

| File Name | Rows | Columns | Size (Bytes) | Composite Primary Key | Purpose |
| :--- | ---: | ---: | ---: | :--- | :--- |
| `powerbi_model_benchmarks.csv` | 10 | 31 | 2,363 | `(Dataset, Model)` | Complete model benchmark table combining the 8 Databricks evaluation metrics, `TN/FP/FN/TP` confusion counts, 7 derived diagnostic rates, and dataset-scoped rankings. |
| `powerbi_confusion_matrix_long.csv` | 40 | 11 | 4,433 | `(Dataset, Model, Quadrant)` | Long-format (unpivoted) confusion matrix table (10 evaluations × 4 quadrants) for native Power BI 2×2 Matrix visuals and stacked error composition charts. |
| `powerbi_dataset_split_summary.csv` | 4 | 13 | 569 | `(Dataset, Split)` | High-level summary of record counts, class balance (`Normal` vs. `Attack`), raw column counts, engineered feature dimensions, unique test records (`104,876`), and total model-record evaluations (`524,380`). |
| `powerbi_attack_taxonomy.csv` | 81 | 15 | 8,252 | `(Dataset, Split, Attack_Subtype)` | Multi-class attack subtype distribution preserving the exact original dataset labels (`attack_cat` in UNSW-NB15 and `label` in NSL-KDD) and flagging subtypes that occur in the test split but not in the training split (`Unseen_In_Training`). |
| `powerbi_network_vectors.csv` | 2,840 | 14 | 203,589 | `(Dataset, Split, Protocol, Service, Connection_State, Attack_Subtype)` | Multi-dimensional network traffic aggregation by protocol, application service, connection state/flag, and attack subtype for decomposition trees and protocol/service matrices. |
| `powerbi_nslkdd_difficulty.csv` | 44 | 10 | 2,710 | `(Dataset, Split, Difficulty_Level)` | Descriptive distribution of `Normal` and `Attack` records across NSL-KDD `difficulty_level` (`0`–`21`) in `KDDTrain+` and `KDDTest+`. |
| `generate_powerbi_exports.py` | — | — | — | Python Script | Reproducible generator and validator script that builds all six CSV files above from `src/data/*.csv` and `datasets/`. |
| `SentinelX_PowerBI.pbix` | — | — | 171,156 | Power BI Report | Saved Power BI Desktop report file containing the imported data model and report views. |

---

## 2. Detailed Column Dictionaries & Aggregation Methodology

### 2.1 `powerbi_model_benchmarks.csv` (10 Rows, 31 Columns)
- **Data Sources:** Inner join (`1:1` on `Dataset`, `Model`) of `src/data/final_benchmarks.csv` and `src/data/confusion_matrices.csv`.
- **Columns:**
  - `Dataset`: Dataset identifier (`UNSW-NB15` or `NSL-KDD`).
  - `Model`: Spark MLlib classifier (`Logistic Regression`, `Random Forest`, `Linear SVC`, `Gradient-Boosted Trees`, `Naive Bayes`).
  - `Accuracy`, `Weighted_Precision`, `Weighted_Recall`, `Weighted_F1`, `Attack_Precision`, `Attack_Recall`, `Attack_F1`, `AUC_ROC`: Exact floating-point metrics exported from Databricks (`final_benchmarks.csv`).
  - `TN`, `FP`, `FN`, `TP`: Exact integer confusion matrix counts exported from Databricks (`confusion_matrices.csv`).
  - `Test_Records`: `TN + FP + FN + TP` (`82,332` for `UNSW-NB15`; `22,544` for `NSL-KDD`).
  - `Actual_Normal`: `TN + FP` (`37,000` for `UNSW-NB15`; `9,711` for `NSL-KDD`).
  - `Actual_Attack`: `FN + TP` (`45,332` for `UNSW-NB15`; `12,833` for `NSL-KDD`).
  - `Predicted_Normal`: `TN + FN`.
  - `Predicted_Attack`: `TP + FP`.
  - `FPR` (False Positive Rate): `FP / (FP + TN)` if `(FP + TN) > 0` else `0.0`.
  - `FNR` (False Negative Rate): `FN / (FN + TP)` if `(FN + TP) > 0` else `0.0`.
  - `Specificity` (True Negative Rate): `TN / (TN + FP)` if `(TN + FP) > 0` else `0.0`.
  - `NPV` (Negative Predictive Value): `TN / (TN + FN)` if `(TN + FN) > 0` else `0.0`.
  - `Balanced_Accuracy`: `(TPR + Specificity) / 2`, where `TPR = TP / (TP + FN)` (with zero-division guard).
  - `MCC` (Matthews Correlation Coefficient): `((TP * TN) - (FP * FN)) / sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN))` evaluated in 64-bit floating-point arithmetic to prevent 32-bit integer overflow, returning `0.0` if the denominator is `0`.
  - `Error_Rate`: `(FP + FN) / (TP + TN + FP + FN)` if total > `0` else `0.0`.
  - `Rank_Accuracy`, `Rank_Weighted_F1`, `Rank_Attack_F1`, `Rank_Attack_Recall`, `Rank_AUC_ROC`: Integer rank (`1` = best, `5` = lowest) partitioned by `Dataset`.

### 2.2 `powerbi_confusion_matrix_long.csv` (40 Rows, 11 Columns)
- **Data Source:** Unpivoted from `src/data/confusion_matrices.csv`.
- **Columns:**
  - `Dataset`, `Model`: Identifiers matching `powerbi_model_benchmarks.csv`.
  - `Quadrant`: Short code (`TN`, `FP`, `FN`, `TP`).
  - `Quadrant_Name`: Descriptive name (`True Negative`, `False Positive`, `False Negative`, `True Positive`).
  - `Actual_Class`: Ground-truth binary class (`Normal` or `Attack`).
  - `Predicted_Class`: Model-predicted binary class (`Normal` or `Attack`).
  - `Outcome_Category`: `Correct Classification` (`TN`, `TP`) or `Misclassification` (`FP`, `FN`).
  - `Record_Count`: Exact integer count for the quadrant (sum across all 40 rows = `524,380` total model-record evaluations).
  - `Test_Set_Total`: Total records in the dataset's test split (`82,332` or `22,544`).
  - `Share_Of_Test_Set`: `Record_Count / Test_Set_Total`.
  - `Share_Of_Actual_Class`: `Record_Count / Actual_Class_Total` (equals `Specificity` for `TN`, `FPR` for `FP`, `FNR` for `FN`, and `Attack_Recall` for `TP`).

### 2.3 `powerbi_dataset_split_summary.csv` (4 Rows, 13 Columns)
- **Data Sources:** Aggregated directly from the 4 original dataset files in `datasets/` and cross-checked against Cells 1–4 of `databricks/Big_Data_Project.ipynb`.
- **Columns:**
  - `Dataset`: `UNSW-NB15` or `NSL-KDD`.
  - `Split`: `Train` or `Test`.
  - `Source_File`: Exact filename in `datasets/`.
  - `Total_Records`: Total rows in the split (`175,341` UNSW Train; `82,332` UNSW Test; `125,973` NSL-KDD Train; `22,544` NSL-KDD Test; Grand Total = `406,190`).
  - `Normal_Records`: Count of `Normal` records (`56,000`, `37,000`, `67,343`, `9,711`; Grand Total = `170,054`).
  - `Attack_Records`: Count of `Attack` records (`119,341`, `45,332`, `58,630`, `12,833`; Grand Total = `236,136`).
  - `Normal_Share`, `Attack_Share`: Proportions of `Total_Records`.
  - `Raw_Column_Count`: `36` for `UNSW-NB15`, `43` for `NSL-KDD`.
  - `Engineered_Feature_Dim`: Post-OneHotEncoder feature vector length (`171` for `UNSW-NB15`, `122` for `NSL-KDD`).
  - `Distinct_Attack_Subtypes`: Number of distinct non-normal attack subtype labels in the split (`9` in UNSW Train/Test; `22` in NSL-KDD Train; `37` in NSL-KDD Test).
  - `Models_Evaluated_On_Split`: `0` for `Train`, `5` for `Test`.
  - `Model_Record_Evaluations`: `Total_Records * Models_Evaluated_On_Split` (`0` for `Train`; `411,660` for UNSW Test; `112,720` for NSL-KDD Test; Total = `524,380`).

### 2.4 `powerbi_attack_taxonomy.csv` (81 Rows, 15 Columns)
- **Data Sources:** Grouped by `(Dataset, Split, Attack_Subtype, Binary_Label)` directly from the 4 original dataset files without inventing or renaming any categories.
- **Columns:**
  - `Dataset`, `Split`: Dataset and split identifiers.
  - `Attack_Subtype`: Exact original string from `attack_cat` (`UNSW-NB15`) or `label` (`NSL-KDD`).
  - `Traffic_Class`: `Normal` (`Binary_Label = 0`) or `Attack` (`Binary_Label = 1`).
  - `Binary_Label`: `0` or `1`.
  - `Unseen_In_Training`: Boolean (`True` / `False`). Set to `True` **only** when `Split == 'Test'`, `Traffic_Class == 'Attack'`, and `Attack_Subtype` does not appear in the corresponding `Train` split (identifies the 17 attack subtypes present in `KDDTest+` but absent from `KDDTrain+`, totaling `3,750` test records).
  - `Record_Count`: Exact record count for this subtype in the split (sums to `406,190`).
  - `Split_Total_Records`: Total records in the split.
  - `Share_Of_Split`: `Record_Count / Split_Total_Records`.
  - `Share_Of_Class_In_Split`: `Record_Count` divided by total `Normal` or `Attack` records in that split.
  - `Mean_Duration`: Mean flow duration (`dur` in `UNSW-NB15`, `duration` in `NSL-KDD`).
  - `Mean_Src_Bytes`, `Mean_Dst_Bytes`: Mean source and destination bytes per flow (`sbytes`/`dbytes` in `UNSW-NB15`, `src_bytes`/`dst_bytes` in `NSL-KDD`).
  - `Total_Src_Bytes`, `Total_Dst_Bytes`: Exact integer sums of source and destination bytes (`8,183,552,556` and `6,245,200,812` across all rows).

### 2.5 `powerbi_network_vectors.csv` (2,840 Rows, 14 Columns)
- **Data Sources:** Grouped by `(Dataset, Split, Protocol, Service, Connection_State, Attack_Subtype, Binary_Label)` directly from the 4 original dataset files.
- **Columns:**
  - `Dataset`, `Split`: Dataset and split identifiers.
  - `Protocol`: Exact value from `proto` (`UNSW-NB15`) or `protocol_type` (`NSL-KDD`).
  - `Service`: Exact value from `service` (`UNSW-NB15` and `NSL-KDD`), used to analyze the **Most Frequently Observed Application Services**.
  - `Connection_State`: Exact value from `state` (`UNSW-NB15`) or `flag` (`NSL-KDD`).
  - `Attack_Subtype`: Exact value from `attack_cat` (`UNSW-NB15`) or `label` (`NSL-KDD`).
  - `Traffic_Class`, `Binary_Label`: `Normal` (`0`) or `Attack` (`1`).
  - `Record_Count`: Exact flow count for this vector tuple (sums to `406,190`).
  - `Mean_Duration`, `Total_Src_Bytes`, `Total_Dst_Bytes`, `Mean_Src_Bytes`, `Mean_Dst_Bytes`: Flow duration and byte volume aggregations for the tuple.

### 2.6 `powerbi_nslkdd_difficulty.csv` (44 Rows, 10 Columns)
- **Data Sources:** Grouped by `(Split, difficulty_level)` from `datasets/nsl-kdd/KDDTrain+.txt` and `datasets/nsl-kdd/KDDTest+.txt`.
- **Columns:**
  - `Dataset`: Always `NSL-KDD`.
  - `Split`: `Train` or `Test`.
  - `Difficulty_Level`: Integer from `0` to `21`.
  - `Total_Records`, `Normal_Records`, `Attack_Records`: Exact record counts at each difficulty level (sums to `148,517` total NSL-KDD records).
  - `Normal_Share_At_Level`, `Attack_Share_At_Level`: Class proportions within that difficulty level.
  - `Share_Of_Split_Total`: Share of the split's total records at that difficulty level.
  - `Distinct_Attack_Subtypes_At_Level`: Count of distinct non-normal attack subtype labels observed at that difficulty level.

---

## 3. Importing into Power BI & Recommended Data Model Relationships

### 3.1 Step-by-Step Import Instructions
1. Open **Power BI Desktop**.
2. Click **Home → Get Data → Text/CSV** and import all six CSV files from the `powerbi/` folder using **UTF-8** encoding and **First row as headers** (Power Query will automatically detect headers, integer/decimal types, and boolean `True`/`False` values).
3. In **Power Query Editor**, verify that percentage/rate columns (`Accuracy`, `Weighted_F1`, `Attack_F1`, `FPR`, `FNR`, `Specificity`, `NPV`, `Balanced_Accuracy`, `Error_Rate`, `Share_Of_Split`, etc.) are set to **Decimal Number** and formatted as **Percentage** (`0.00%`) in the Report view.

### 3.2 Recommended Relationships (Star / Bridge Schema)
Because Power BI relationships require a single-column key per link, use either a 2-row `Dim_Dataset` table (`UNSW-NB15`, `NSL-KDD`) or the following calculated composite keys in DAX / Power Query:

1. **Model Evaluation Link (`1:Many` from `powerbi_model_benchmarks` to `powerbi_confusion_matrix_long`):**
   - Create a calculated column in both tables:
     `Dataset_Model_Key = [Dataset] & " | " & [Model]`
   - Relate `powerbi_model_benchmarks[Dataset_Model_Key]` (`1`) $\rightarrow$ `powerbi_confusion_matrix_long[Dataset_Model_Key]` (`*`, Single/Both filter direction).
2. **Dataset Split Link (`1:Many` from `powerbi_dataset_split_summary` to dataset-level tables):**
   - Create a calculated column in `powerbi_dataset_split_summary`, `powerbi_attack_taxonomy`, `powerbi_network_vectors`, and `powerbi_nslkdd_difficulty`:
     `Dataset_Split_Key = [Dataset] & " | " & [Split]`
   - Relate:
     - `powerbi_dataset_split_summary[Dataset_Split_Key]` (`1`) $\rightarrow$ `powerbi_attack_taxonomy[Dataset_Split_Key]` (`*`)
     - `powerbi_dataset_split_summary[Dataset_Split_Key]` (`1`) $\rightarrow$ `powerbi_network_vectors[Dataset_Split_Key]` (`*`)
     - `powerbi_dataset_split_summary[Dataset_Split_Key]` (`1`) $\rightarrow$ `powerbi_nslkdd_difficulty[Dataset_Split_Key]` (`*`)
3. **Attack Subtype Link (`1:Many` from `powerbi_attack_taxonomy` to `powerbi_network_vectors`):**
   - Create a calculated column in both tables:
     `Taxonomy_Key = [Dataset] & " | " & [Split] & " | " & [Attack_Subtype]`
   - Relate `powerbi_attack_taxonomy[Taxonomy_Key]` (`1`) $\rightarrow$ `powerbi_network_vectors[Taxonomy_Key]` (`*`).

---

## 4. Recommended 4-Page Power BI Layout

1. **Page 1 — Executive Benchmark & Model Leaderboard**
   - **KPI Cards:**
     - Total Dataset Records Analyzed: `406,190` (`SUM(powerbi_dataset_split_summary[Total_Records])`)
     - Unique Test Records: `104,876` (`CALCULATE(SUM(powerbi_dataset_split_summary[Total_Records]), powerbi_dataset_split_summary[Split] = "Test")`)
     - Total Model-Record Evaluations: `524,380` (`SUM(powerbi_dataset_split_summary[Model_Record_Evaluations])` — `104,876` unique test records evaluated across 5 models)
     - **UNSW-NB15 Verified Leaders:** Best Accuracy (`Gradient-Boosted Trees`, `82.03%`), Best Attack F1 (`Gradient-Boosted Trees`, `85.86%`), Best Weighted F1 (`Gradient-Boosted Trees`, `81.14%`), Best Attack Recall (`Random Forest`, `99.42%`), Best AUC-ROC (`Gradient-Boosted Trees`, `97.20%`).
     - **NSL-KDD Verified Leaders:** Best Accuracy (`Gradient-Boosted Trees`, `79.91%`), Best Attack F1 (`Gradient-Boosted Trees`, `79.10%`), Best Weighted F1 (`Gradient-Boosted Trees`, `79.77%`), Best AUC-ROC (`Random Forest`, `95.12%`).
   - **Visuals:** Clustered Bar Chart of all 5 models by `Weighted_F1`, `Attack_F1`, `Accuracy`, and `AUC_ROC`; Multi-Metric Leaderboard Table with rank columns.

2. **Page 2 — Confusion Matrix & Error Triage Lab**
   - **Visuals:** 2×2 Matrix (`Actual_Class` on Rows, `Predicted_Class` on Columns, `Record_Count` and `Share_Of_Test_Set` on Values); Stacked Bar Chart of `FP` vs. `FN` misclassifications by model; Scatter Plot of `FPR` vs. `Attack_Recall`; Diagnostic KPI Cards for `MCC`, `Balanced_Accuracy`, `Specificity`, `NPV`, and `Error_Rate`.

3. **Page 3 — Threat Taxonomy & Dataset Split Composition**
   - **Visuals:** Train vs. Test class balance bar chart; `Attack_Subtype` distribution chart; Slicer/Filter on `Unseen_In_Training` (`True`/`False`) to inspect the 17 **attack subtypes present in the test split but absent from the training split** (`3,750` records in `KDDTest+`); and an independent descriptive histogram of `NSL-KDD` `Difficulty_Level` (`0`–`21`) distributions across `Train` and `Test`.

4. **Page 4 — Network Vector & Protocol Surface Intelligence**
   - **Visuals:** Decomposition Tree (`Dataset` → `Protocol` → `Service` → `Connection_State` → `Attack_Subtype` by `Record_Count`); Matrix of `Service` × `Connection_State` colored by Attack record share; Bar Chart of **Most Frequently Observed Application Services** (`-`, `dns`, `http`, `private`, `domain_u`, `smtp`, `ftp-data`, `ecr_i`, etc.); and a **Data Provenance Note** explaining the absence of geographic fields in the benchmark datasets.

---

## 5. Limitations, Provenance & Assumptions

1. **No Geographical Identifiers in Source Datasets:** Neither `UNSW-NB15` (`UNSW_NB15_training-set.parquet`, `UNSW_NB15_testing-set.parquet`) nor `NSL-KDD` (`KDDTrain+.txt`, `KDDTest+.txt`) contains IP addresses, country codes, or latitude/longitude coordinates. Both datasets originate from closed synthetic laboratory testbeds. No geographical coordinates or country mappings have been fabricated.
2. **Offline Test-Split Model Evaluations Only:** The Databricks pipeline (`databricks/Big_Data_Project.ipynb`) trained 5 binary classifiers on the training splits and evaluated them exclusively on the test splits (`unsw_test_prep` and `kdd_test_prep`). Training-set model evaluation metrics were not generated in Databricks, so `powerbi_model_benchmarks.csv` and `powerbi_confusion_matrix_long.csv` reflect test-set evaluations only (`104,876` unique test records; `524,380` total model-record evaluations).
3. **Application Service Frequency Interpretation:** The `Service` column in `powerbi_network_vectors.csv` records the application service field logged for each network flow (`-` indicates an unclassified/unspecified service in `UNSW-NB15`). High observation frequency of a service in attack flows reflects the traffic composition of the laboratory dataset and does not by itself prove that an exploit specifically targeted a vulnerability in that service daemon.
4. **Unseen Test-Split Subtypes (`Unseen_In_Training`):** In `powerbi_attack_taxonomy.csv`, `Unseen_In_Training = True` strictly denotes **attack subtypes present in the test split but absent from the training split** (the 17 additional attack labels in `KDDTest+`). They are not labeled or interpreted as confirmed real-world zero-day attacks.
