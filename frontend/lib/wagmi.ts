import { createConfig, http } from 'wagmi'
import { sepolia, hardhat } from 'viem/chains'
import { injected, walletConnect, coinbaseWallet, safe } from 'wagmi/connectors'

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// Solo incluir WalletConnect si el projectId parece válido (no placeholder)
const isValidProjectId =
  rawProjectId.length > 10 &&
  !rawProjectId.includes('tu_project') &&
  !rawProjectId.includes('your_project')

// MetaMask primero; injected genérico para Brave/otros. Incluimos Sepolia y Hardhat (localhost) para que la wallet detecte ambas.
const chains = [sepolia, hardhat] as const

// Un solo conector injected evita que MetaMask reciba doble inicialización (metaMask + injected genérico).
// El usuario verá "MetaMask" o "Injected" según su extensión; solo hay una conexión al provider.
const connectors = [
  injected(),
  ...(isValidProjectId ? [walletConnect({ projectId: rawProjectId })] : []),
  coinbaseWallet({ appName: 'PraesagiumChain' }),
  safe(),
]

const sepoliaRpc = process.env.NEXT_PUBLIC_RPC_URL
const localRpc = 'http://127.0.0.1:8545'

const wagmiConfig = createConfig({
  chains: [...chains],
  connectors,
  transports: {
    [sepolia.id]: http(sepoliaRpc || undefined),
    [hardhat.id]: http(localRpc),
  },
})

/** Wagmi v2 config — use this in providers and hooks */
export const config = wagmiConfig

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
