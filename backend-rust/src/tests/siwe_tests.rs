use crate::services::siwe::normalize_address;
use crate::error::AppError;

#[test]
fn normalize_address_accepts_valid_hex() {
    let a = normalize_address("0xAbCdEf0123456789AbCdEf0123456789AbCdEf01").unwrap();
    assert_eq!(a, "0xabcdef0123456789abcdef0123456789abcdef01");
}

#[test]
fn normalize_address_rejects_short_string() {
    let e = normalize_address("0x1234").unwrap_err();
    assert!(matches!(e, AppError::Validation(_)));
}
