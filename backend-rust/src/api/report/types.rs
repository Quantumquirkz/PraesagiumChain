use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct OutcomeResponse {
    pub outcome: u8, // 0 = No, 1 = Yes
}
