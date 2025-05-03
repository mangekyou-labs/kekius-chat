"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Loader2, Wallet as WalletIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { connectToHederaWallet } from "@/wallet/hederaWalletConnection";

interface EarlyAccessPageProps {
  hederaAccountId: string | null;
  setHederaAccountId: (address: string | null) => void;
  isWhitelisted: boolean;
  setIsWhitelisted: (isWL: boolean) => void;
}

const EarlyAccessPage = ({
  hederaAccountId,
  setHederaAccountId,
  isWhitelisted,
  setIsWhitelisted,
}: EarlyAccessPageProps) => {
  const [referralCode, setReferralCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<string>();

  const checkIsWhitelisted = useCallback(async () => {
    try {
      setIsLoading(true);
      // Query Hedera contract state or REST API to check if user is whitelisted
      // This is a placeholder for the actual implementation
      const response = await fetch(`/api/hedera/whitelist?accountId=${hederaAccountId}`);
      const data = await response.json();

      setIsLoading(false);
      setIsWhitelisted(data.isWhitelisted);
    } catch (error) {
      setIsLoading(false);
      setIsWhitelisted(false);
      console.error("Error checking whitelist status:", error);
    }
  }, [hederaAccountId]);

  useEffect(() => {
    if (hederaAccountId) {
      checkIsWhitelisted();
    }
  }, [hederaAccountId, checkIsWhitelisted]);

  const handleConnectWallet = async (walletProvider: string) => {
    try {
      setIsLoading(true);
      const { accountId, token } = await connectToHederaWallet(walletProvider);

      if (accountId) {
        setWalletType(walletProvider);
        setHederaAccountId(accountId);
        toast.success("Wallet Connected!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Login failed.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const joinEAP = async (ref_code: string) => {
    try {
      setIsLoading(true);
      if (hederaAccountId) {
        // Execute Hedera smart contract or API call to join whitelist
        // This is a placeholder for the actual implementation
        const response = await fetch('/api/hedera/join-whitelist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: hederaAccountId,
            referralCode: ref_code || ""
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to join whitelist");
        }

        localStorage.removeItem("token");
        await fetch('/api/users/create-hedera-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hederaAccountId }),
        });

        setHederaAccountId(null);
        toast.success("Payment success! Please connect your wallet again.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Something went wrong!"}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      console.error("Error joining EAP:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <ToastContainer />
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 ">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
            Welcome to Kekius
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {hederaAccountId
              ? "Join our Early Access Program"
              : "Connect your Hedera wallet to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <>
              {!hederaAccountId ? (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-5"
                    onClick={() => handleConnectWallet('hashpack')}
                  >
                    <WalletIcon className="h-5 w-5" />
                    Connect HashPack
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 py-5"
                    onClick={() => handleConnectWallet('bladewallet')}
                  >
                    <WalletIcon className="h-5 w-5" />
                    Connect Blade Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-zinc-800 rounded-lg p-3 break-words">
                    <p className="text-xs text-zinc-500 mb-1">Connected Account</p>
                    <p className="text-zinc-200">{hederaAccountId}</p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-400 mb-2">
                      Have a referral code? Enter it below (optional):
                    </p>
                    <Input
                      className="bg-zinc-800 border-zinc-700 text-zinc-200"
                      placeholder="Referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-zinc-400">
                      Join our Early Access Program by paying a small fee of 1 HBAR
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5"
                      onClick={() => joinEAP(referralCode)}
                    >
                      Pay 1 HBAR to Join
                    </Button>
                    <p className="text-xs text-zinc-500 italic">
                      Note: You will be asked to confirm this transaction in your wallet
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500 text-center">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EarlyAccessPage;
