"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  PrivyProvider,
  usePrivy,
  useWallets,
  type ConnectedWallet
} from "@privy-io/react-auth";
import { monadTestnet } from "@/lib/early/escrow-interface";

type EthereumProvider = Awaited<ReturnType<ConnectedWallet["getEthereumProvider"]>>;

type EarlyAuthValue = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  displayName: string;
  walletAddress: string;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  getEthereumProvider: () => Promise<EthereumProvider>;
  switchChain: (chainId: number) => Promise<void>;
};

const missingProvider = async () => {
  throw new Error("Add NEXT_PUBLIC_PRIVY_APP_ID to .env.local to enable Early accounts.");
};

const missingAuth: EarlyAuthValue = {
  configured: false,
  ready: true,
  authenticated: false,
  displayName: "",
  walletAddress: "",
  login: () => window.alert("Add NEXT_PUBLIC_PRIVY_APP_ID to .env.local to enable Early accounts."),
  logout: async () => undefined,
  getAccessToken: missingProvider,
  getEthereumProvider: missingProvider,
  switchChain: missingProvider
};

const EarlyAuthContext = createContext<EarlyAuthValue>(missingAuth);

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets.find((wallet) => wallet.walletClientType === "privy") ?? wallets[0];
  const email = user?.email?.address;
  const socialName = user?.google?.name ?? user?.twitter?.name;

  const readAccessToken = useCallback(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in again to continue.");
      return token;
    }, [getAccessToken]);
  const readEthereumProvider = useCallback(async () => {
      if (!activeWallet) {
        throw new Error("Sign in or connect a wallet before creating a private tier.");
      }
      return activeWallet.getEthereumProvider();
    }, [activeWallet]);
  const changeChain = useCallback(async (chainId: number) => {
      if (!activeWallet) {
        throw new Error("Sign in or connect a wallet before creating a private tier.");
      }
      await activeWallet.switchChain(chainId);
    }, [activeWallet]);
  const value = useMemo<EarlyAuthValue>(
    () => ({
      configured: true,
      ready,
      authenticated,
      displayName:
        socialName ||
        email ||
        (activeWallet?.address
          ? `${activeWallet.address.slice(0, 6)}...${activeWallet.address.slice(-4)}`
          : ""),
      walletAddress: activeWallet?.address ?? "",
      login,
      logout,
      getAccessToken: readAccessToken,
      getEthereumProvider: readEthereumProvider,
      switchChain: changeChain,
    }),
    [
      activeWallet,
      authenticated,
      changeChain,
      email,
      login,
      logout,
      readAccessToken,
      readEthereumProvider,
      ready,
      socialName,
    ]
  );

  return <EarlyAuthContext.Provider value={value}>{children}</EarlyAuthContext.Provider>;
}

export function EarlyAuthProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <EarlyAuthContext.Provider value={missingAuth}>
        {children}
      </EarlyAuthContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet, {
          id: 84532, name: "Base Sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: ["https://sepolia.base.org"] } }, testnet: true,
        }, {
          id: 11155111, name: "Ethereum Sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] } }, testnet: true,
        }],
        loginMethods: ["email", "google", "twitter", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#123F32",
          logo: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 100" width="180" height="60" aria-label="Early">
            <image href="/branding/early-lockup.svg" width="304" height="100" />
          </svg>,
          showWalletLoginFirst: false
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets"
          }
        }
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

export function useEarlyAuth() {
  return useContext(EarlyAuthContext);
}
