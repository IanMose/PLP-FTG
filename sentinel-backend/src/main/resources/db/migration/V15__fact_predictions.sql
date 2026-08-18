-- V15: ML model prediction scores per site
-- Stores the output of src/predict.py scored on each pipeline run.

CREATE TABLE fact_predictions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id       VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    as_of_date    DATE         NOT NULL,
    probability   NUMERIC(7,4) NOT NULL,
    model_version VARCHAR(50),
    top_features  TEXT,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_predictions_site_date UNIQUE (site_id, as_of_date)
);

CREATE INDEX idx_predictions_site_date ON fact_predictions(site_id, as_of_date DESC);
