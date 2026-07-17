"""Cross-validate the seed model. Useful as a baseline, not a production claim."""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import FeatureUnion, Pipeline

from model import LEGIT_MESSAGES, SCAM_MESSAGES

messages = SCAM_MESSAGES + LEGIT_MESSAGES
labels = [1] * len(SCAM_MESSAGES) + [0] * len(LEGIT_MESSAGES)

pipeline = Pipeline([
    ("features", FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=2, sublinear_tf=True)),
    ])),
    ("classifier", LogisticRegression(max_iter=1200, C=3.0, class_weight="balanced", random_state=42)),
])

folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
predictions = cross_val_predict(pipeline, messages, labels, cv=folds)

print("ScamShield seed-corpus 5-fold cross-validation")
print(f"Samples:   {len(messages)}")
print(f"Accuracy:  {accuracy_score(labels, predictions):.3f}")
print(f"Precision: {precision_score(labels, predictions):.3f}")
print(f"Recall:    {recall_score(labels, predictions):.3f}")
print(f"F1 score:  {f1_score(labels, predictions):.3f}")
print("\nNote: Expand and independently review the dataset before citing these scores externally.")
