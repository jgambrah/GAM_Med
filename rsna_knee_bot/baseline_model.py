"""
RSNA Knee Abnormality Detection - Competition Baseline & Schema
Defines the 12 clinical targets, probability calibration, and submission format.
"""

# The 12 Clinical Target Abnormalities for RSNA Knee MRI Challenge
TARGET_COLUMNS = [
    "ACL",
    "MCL",
    "Medial Meniscus",
    "Lateral Meniscus",
    "Medial OA",
    "Lateral OA",
    "PF OA",
    "Effusion",
    "Synovitis",
    "Baker's",
    "Contusion",
    "Fracture"
]

# Clinical Prior Probabilities (Base Prevalence in Knee MRI Studies)
CLINICAL_PRIORS = {
    "ACL": 0.28,
    "MCL": 0.15,
    "Medial Meniscus": 0.38,
    "Lateral Meniscus": 0.22,
    "Medial OA": 0.45,
    "Lateral OA": 0.25,
    "PF OA": 0.32,
    "Effusion": 0.52,
    "Synovitis": 0.35,
    "Baker's": 0.18,
    "Contusion": 0.20,
    "Fracture": 0.08
}

import pandas as pd
import numpy as np

def generate_baseline_predictions(test_df):
    """
    Generates calibrated probability predictions for each study in the test set.
    """
    predictions_df = pd.DataFrame()
    predictions_df["StudyInstanceUID"] = test_df["StudyInstanceUID"]

    for col in TARGET_COLUMNS:
        prior = CLINICAL_PRIORS.get(col, 0.25)
        # Apply slight random perturbation around clinical prior for baseline
        predictions_df[col] = np.clip(
            np.random.normal(loc=prior, scale=0.02, size=len(test_df)),
            0.001,
            0.999
        )

    return predictions_df
