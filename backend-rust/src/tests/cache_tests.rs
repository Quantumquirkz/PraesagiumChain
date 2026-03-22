use crate::services::Cache;
use predictor::PredictionResult;

fn make_result(hash: [u8; 32]) -> PredictionResult {
    PredictionResult {
        probability: 0.75,
        uncertainty: 0.1,
        model_version: "test-v1".to_string(),
        model_hash: hash,
    }
}

#[tokio::test]
async fn cache_hit_preserves_model_hash() {
    let cache = Cache::new();
    let hash = [42u8; 32];
    let result = make_result(hash);

    cache.set_prediction(1, &result, 3600).await;
    let cached = cache.get_prediction(1).await.expect("should be a cache hit");

    assert_eq!(cached.model_hash, hash, "model_hash must be preserved on cache hit");
    assert_eq!(cached.probability, 0.75);
    assert_eq!(cached.model_version, "test-v1");
}

#[tokio::test]
async fn cache_miss_after_invalidation() {
    let cache = Cache::new();
    let result = make_result([1u8; 32]);
    cache.set_prediction(2, &result, 3600).await;
    cache.invalidate_market(2).await;
    assert!(cache.get_prediction(2).await.is_none());
}

#[tokio::test]
async fn cache_stats_reflect_entries() {
    let cache = Cache::new();
    assert_eq!(cache.stats().await.cached_predictions, 0);
    cache.set_prediction(10, &make_result([0u8; 32]), 3600).await;
    cache.set_prediction(11, &make_result([0u8; 32]), 3600).await;
    assert_eq!(cache.stats().await.cached_predictions, 2);
}
