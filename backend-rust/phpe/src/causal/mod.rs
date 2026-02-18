pub mod dag;
pub mod inference;

pub use dag::CausalGraph;
pub use inference::{infer_latents, CausalState};
