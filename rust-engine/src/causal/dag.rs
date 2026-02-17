//! Grafo causal dirigido (DAG). Estructura mínima para futura inferencia.

use serde::{Deserialize, Serialize};

/// Nodo del grafo: identificador y nombre de variable.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CausalNode {
    pub id: usize,
    pub name: String,
}

/// Arista dirigida: padre -> hijo.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CausalEdge {
    pub from: usize,
    pub to: usize,
}

/// DAG causal versionado.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct CausalGraph {
    pub version: String,
    pub nodes: Vec<CausalNode>,
    pub edges: Vec<CausalEdge>,
}

impl CausalGraph {
    pub fn empty(version: impl Into<String>) -> Self {
        Self {
            version: version.into(),
            nodes: vec![],
            edges: vec![],
        }
    }
}
