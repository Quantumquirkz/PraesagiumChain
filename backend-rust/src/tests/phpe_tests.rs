use predictor::{default_context, predict, EventFeatures, TimeSeriesSample};

fn make_series(rows: &[&[f32]]) -> TimeSeriesSample {
    let features: Vec<EventFeatures> = rows
        .iter()
        .map(|r| EventFeatures::new(r.to_vec()))
        .collect();
    let timestamps: Vec<u64> = (0..features.len() as u64).collect();
    TimeSeriesSample::new(timestamps, features)
}

#[test]
fn predict_returns_valid_range() {
    let ts = make_series(&[&[0.1, 0.2], &[0.2, 0.3], &[0.15, 0.25]]);
    let ctx = default_context(&ts);
    let result = predict(&ts, &ctx);
    assert!(
        (0.0..=1.0).contains(&result.probability),
        "probability out of range: {}",
        result.probability
    );
    assert!(
        (0.0..=1.0).contains(&result.uncertainty),
        "uncertainty out of range: {}",
        result.uncertainty
    );
}

#[test]
fn predict_empty_series_handled() {
    let ts = TimeSeriesSample::new(vec![], vec![]);
    let ctx = default_context(&ts);
    let result = predict(&ts, &ctx);
    assert!((0.0..=1.0).contains(&result.probability));
}

#[test]
fn model_hash_is_deterministic() {
    let ts = make_series(&[&[1.0], &[2.0]]);
    let ctx = default_context(&ts);
    let r1 = predict(&ts, &ctx);
    let r2 = predict(&ts, &ctx);
    assert_eq!(r1.model_hash, r2.model_hash, "model_hash should be deterministic");
}

#[test]
fn sliding_window_context_chosen_for_long_series() {
    let rows: Vec<Vec<f32>> = (0..20).map(|i| vec![i as f32]).collect();
    let refs: Vec<&[f32]> = rows.iter().map(|v| v.as_slice()).collect();
    let ts = make_series(&refs);
    let ctx = default_context(&ts);
    assert!(
        matches!(ctx.temporal_params.strategy, predictor::EncodingStrategy::SlidingWindow(10)),
        "expected SlidingWindow(10) for 20-point series"
    );
}
