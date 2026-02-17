# Referencias de APIs

Este documento lista las APIs externas y servicios utilizados en PraesagiumChain.

## Chainlink

### Chainlink Functions

- **Documentación**: https://docs.chain.link/chainlink-functions
- **Uso en PraesagiumChain**: Resolución de mercados basada en datos externos
- **Ejemplo de request**:
  ```javascript
  // Código ejecutado off-chain por Chainlink
  const apiResponse = await Functions.makeHttpRequest({
    url: "https://api.example.com/data"
  });
  return Functions.encodeString(apiResponse.data.result);
  ```

### Chainlink Any API

- **Documentación**: https://docs.chain.link/any-api
- **Uso**: Obtener datos de APIs externas de forma descentralizada
- **Configuración**: Job en Chainlink Node que consulta la API y devuelve resultado

### Chainlink Data Feeds

- **Documentación**: https://docs.chain.link/data-feeds
- **Uso potencial**: Precios de activos, indicadores económicos
- **Ejemplo**: Precio de BTC/USD para mercados relacionados con criptomonedas

## APIs Externas (Ejemplos)

### APIs de Datos Económicos

- **FRED API** (Federal Reserve Economic Data)
  - URL: https://fred.stlouisfed.org/docs/api/
  - Uso: Indicadores macroeconómicos (inflación, empleo, PIB)
  
- **Alpha Vantage**
  - URL: https://www.alphavantage.co/documentation/
  - Uso: Datos financieros, acciones, forex

### APIs de Noticias y Sentimiento

- **NewsAPI**
  - URL: https://newsapi.org/docs
  - Uso: Análisis de sentimiento, eventos noticiosos

- **Twitter API** (si se integra)
  - URL: https://developer.twitter.com/en/docs
  - Uso: Análisis de sentimiento social

### APIs de Deportes

- **TheSportsDB**
  - URL: https://www.thesportsdb.com/api.php
  - Uso: Resultados deportivos para mercados de predicción deportiva

## Formato de Datos

### Entrada al Motor PHPE

```json
{
  "timestamps": [1000, 2000, 3000],
  "features": [
    { "values": [0.1, 0.2, 0.3] },
    { "values": [0.2, 0.3, 0.4] },
    { "values": [0.15, 0.25, 0.35] }
  ]
}
```

### Salida del Motor PHPE

```json
{
  "probability": 0.75,
  "uncertainty": 0.15,
  "model_version": "0.1.0",
  "model_hash": [/* 32 bytes */]
}
```

## Autenticación

### APIs que Requieren API Keys

- Configurar en variables de entorno:
  ```bash
  FRED_API_KEY=...
  ALPHA_VANTAGE_API_KEY=...
  NEWS_API_KEY=...
  ```

- En Chainlink Functions, las API keys se pueden pasar como secrets:
  ```javascript
  const apiKey = secrets.apiKey;
  const response = await Functions.makeHttpRequest({
    url: `https://api.example.com/data?key=${apiKey}`
  });
  ```

## Rate Limits

- **FRED API**: 120 requests/minuto (con API key)
- **Alpha Vantage**: 5 requests/minuto (free tier)
- **NewsAPI**: 100 requests/día (free tier)

Considerar caching y rate limiting en el backend si se consultan directamente.

## Próximos Pasos

- [ ] Integrar APIs específicas según casos de uso
- [ ] Implementar caching de respuestas de APIs
- [ ] Sistema de fallback si una API falla
- [ ] Métricas de confiabilidad de APIs
