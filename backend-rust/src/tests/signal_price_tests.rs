use crate::services::sources::types::Signal;

#[test]
fn signal_default_has_none_price() {
    let sig = Signal::default();
    assert!(sig.price.is_none());
    assert!(sig.price_change_24h.is_none());
}
