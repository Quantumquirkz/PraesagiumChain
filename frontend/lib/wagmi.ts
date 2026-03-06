import { createConfig, http } from 'wagmi'
import { sepolia } from 'viem/chains'
import { injected, walletConnect, coinbaseWallet, safe } from 'wagmi/connectors'

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// Solo incluir WalletConnect si el projectId parece válido (no placeholder)
const isValidProjectId =
  rawProjectId.length > 10 &&
  !rawProjectId.includes('tu_project') &&
  !rawProjectId.includes('your_project')

// MetaMask primero; injected genérico para Brave/otros. En el modal verás ambas opciones.
const connectors = [
  injected({ target: 'metaMask' }),
  injected(),
  ...(isValidProjectId ? [walletConnect({ projectId: rawProjectId })] : []),
  coinbaseWallet({ appName: 'PraesagiumChain' }),
  safe(),
]

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors,
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
})

/** Alias para compatibilidad con imports existentes */
export const config = wagmiConfig

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
