# Funcionalidades restauradas / mejoras (manteniendo home + LIVE MARKETS)

## Se mantiene (no tocado)
- Home con "PREDICT THE FUTURE. ON-CHAIN.", estadísticas, Browse Markets, Create Market.
- Panel LIVE MARKETS con mercado destacado, YES/NO bar, PHPE Signal, Confidence, tarjetas y actividad reciente.

## Cambios incluidos
1. **market-detail.tsx**: fix runtime (yesPct/noPct defensivos, safePredictions); eliminados badges Chainlink del sidebar.
2. **bet-form.tsx**: Place Bet simplificado; símbolo de apuesta desde metadata del mercado (elegido al crear).
3. **Create market**: nota de que el token elegido es el símbolo mostrado al apostar.
4. **Config**: docker-compose, config/env.example, scripts/docker-up.sh, backend-rust config, next.config, docs restaurados al estado pre-pull.

## Cómo conservar tras un git pull
- Hacer commit de estos cambios y push a tu rama.
- Si tu compañera hace pull de main y tú tenías commits locales, antes del pull: `git stash` o trabajar en una rama y luego merge/rebase.
