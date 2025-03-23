"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { config } from "@/config";

// TypeScript interfaces for our data structures
interface AccountInfo {
  name?: string;
  login?: string;
  balance?: number;
  equity?: number;
  marginLevel?: number;
}

interface Position {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number | string;
  lastUpdate?: number; // Add timestamp for tracking updates
  priceChange?: "up" | "down" | null; // Track price direction
  tickDirection?: "up" | "down" | null; // Micro movements between server updates
  lastTickTime?: number; // For micro movements
  isRealData?: boolean; // Track if data is from real source or interpolated
}

interface Order {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  state: string;
}

interface AccountData {
  accountId: string;
  connected?: boolean;
  connectedToBroker?: boolean;
  accountInfo?: AccountInfo;
  positions?: Position[];
  orders?: Order[];
}

interface AccountFormData {
  login: string;
  server: string;
  password: string;
  name?: string;
}

// Add a new interface for PnL history
interface PnLHistoryItem {
  timestamp: number;
  value: number;
}

// Simple SparkLine component
const SparkLine = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="h-8 w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Add Account Modal Component
const AccountModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<boolean>;
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    login: "",
    server: "",
    password: "",
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit(formData);
      if (success) {
        onClose();
        setFormData({
          login: "",
          server: "",
          password: "",
          name: "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add Trading Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-300 text-sm font-bold mb-2"
              htmlFor="login"
            >
              Login (Account Number)
            </label>
            <input
              id="login"
              name="login"
              type="text"
              value={formData.login}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-300 text-sm font-bold mb-2"
              htmlFor="server"
            >
              Server
            </label>
            <input
              id="server"
              name="server"
              type="text"
              value={formData.server}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="e.g. Exness-MT5Trial14"
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-300 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-6">
            <label
              className="block text-gray-300 text-sm font-bold mb-2"
              htmlFor="name"
            >
              Account Name (Optional)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="bg-gray-800 border border-gray-700 rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. My Trading Account"
            />
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Home() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [netPnL, setNetPnL] = useState<number>(0);
  const [pnlBySymbol, setPnlBySymbol] = useState<Record<string, number>>({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(Date.now());
  const [pnlHistory, setPnlHistory] = useState<PnLHistoryItem[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
const [logoutError, setLogoutError] = useState<string | null>(null);
const router = useRouter();
const { logout } = useAuth();
  const [pnlHistoryBySymbol, setPnlHistoryBySymbol] = useState<
    Record<string, PnLHistoryItem[]>
  >({});
  const [realTimeEnabled, setRealTimeEnabled] = useState<boolean>(true); // Toggle for real-time simulation

  // Track if profit has increased or decreased
  const prevNetPnLRef = useRef<number>(0);
  const [pnlChange, setPnlChange] = useState<"up" | "down" | null>(null);

  // Add a new state variable to track the last real data refresh time
  const [lastRealDataUpdate, setLastRealDataUpdate] = useState<number | null>(
    null
  );

  // Add new state variables for auto-refresh functionality
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { isAuthenticated, isLoading } = useAuth();

  // Get the selected account data
  const selectedAccountData = accounts.find(
    (acc) => acc.accountId === selectedAccount
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch accounts on initial load
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${config.server}/accounts`);
        if (!response.ok) {
          throw new Error("Failed to fetch accounts");
        }
        const data = await response.json();
        setAccounts(data);
        // Select first account if available
        if (data.length > 0) {
          setSelectedAccount(data[0].accountId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Enhanced WebSocket handler to properly mark data from server as real
  useEffect(() => {
    const ws = new WebSocket(`${config.server}/ws`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data.event);

      // Handle different types of events
      switch (data.event) {
        case "initialAccounts":
          if (data.accounts) {
            // Mark data as real since it's coming from the server
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const accountsWithRealFlag = data.accounts.map((account: any) => {
              if (account.positions) {
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                account.positions = account.positions.map((pos: any) => ({
                  ...pos,
                  isRealData: true,
                  lastUpdate: Date.now(),
                }));
              }
              return account;
            });
            setAccounts(accountsWithRealFlag);
            setLastRealDataUpdate(Date.now()); // Set the last real data update timestamp
          } else {
            setAccounts(data.accounts);
          }
          break;
        case "accountSynchronized":
        case "accountInformationUpdated":
          updateAccountInfo(data);
          setLastRealDataUpdate(Date.now()); // Set the last real data update timestamp
          break;
        case "positionsUpdated":
        case "positionUpdated":
        case "positionRemoved":
          updatePositions(data);
          setLastRealDataUpdate(Date.now()); // Set the last real data update timestamp
          break;
        case "orderCompleted":
          updateOrders(data);
          setLastRealDataUpdate(Date.now()); // Set the last real data update timestamp
          break;
        case "accountConnected":
        case "accountDisconnected":
          refreshAccounts();
          break;
        default:
          console.log("Unhandled event:", data.event);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Record PnL history
  useEffect(() => {
    // Only record every 5 seconds to avoid too many data points
    const interval = setInterval(() => {
      if (netPnL !== 0) {
        const newHistoryItem = { timestamp: Date.now(), value: netPnL };
        setPnlHistory((prev) => {
          // Keep last 60 items (5 minutes of data at 5-second intervals)
          const newHistory = [...prev, newHistoryItem].slice(-60);
          return newHistory;
        });

        // Also record history by symbol
        Object.entries(pnlBySymbol).forEach(([symbol, profit]) => {
          setPnlHistoryBySymbol((prev) => {
            const symbolHistory = prev[symbol] || [];
            const newSymbolHistory = [
              ...symbolHistory,
              { timestamp: Date.now(), value: profit },
            ].slice(-60);
            return { ...prev, [symbol]: newSymbolHistory };
          });
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [netPnL, pnlBySymbol]);

  // Improved simulation which only enhances real data with small interpolations between server updates
  useEffect(() => {
    if (!realTimeEnabled || !selectedAccountData?.positions) return;

    // Create small price movements every 500ms for a more real-time feel - faster than before
    const interval = setInterval(() => {
      setAccounts((prevAccounts) => {
        return prevAccounts.map((account) => {
          if (account.accountId !== selectedAccount) return account;

          // No positions, return unchanged
          if (!account.positions || account.positions.length === 0)
            return account;

          // Create small random price movements for each position
          const updatedPositions: Position[] = account.positions.map(
            (position) => {
              // Only interpolate if we have real data to base it on
              if (!position.lastUpdate) {
                return position; // Skip this position if no real data
              }

              // Random small price change (±0.01-0.05% of current price)
              const changePercent =
                (Math.random() * 0.0004 + 0.0001) *
                (Math.random() > 0.5 ? 1 : -1);
              const priceChange = position.currentPrice * changePercent;
              const newPrice = Number(position.currentPrice) + priceChange;

              // Make sure tickDirection is properly typed
              const tickDirection: "up" | "down" | null =
                priceChange > 0 ? "up" : priceChange < 0 ? "down" : null;

              // Calculate new profit based on price change
              let newProfit = Number(position.profit);

              if (position.type === "POSITION_TYPE_BUY") {
                // For buy positions, profit increases when price goes up
                newProfit += priceChange * Number(position.volume);
              } else {
                // For sell positions, profit increases when price goes down
                newProfit -= priceChange * Number(position.volume);
              }

              // Create a properly typed updated position object
              const updatedPosition: Position = {
                ...position,
                currentPrice: newPrice,
                profit: newProfit,
                tickDirection,
                lastTickTime: Date.now(),
                isRealData: false, // Mark as interpolated data
              };

              return updatedPosition;
            }
          );

          // Return properly typed account with updated positions
          return {
            ...account,
            positions: updatedPositions,
          };
        });
      });

      // Also update the last price update timestamp
      setLastPriceUpdate(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [selectedAccount, selectedAccountData?.positions, realTimeEnabled]);

  // Calculate Net PnL whenever selected account or its positions change
  useEffect(() => {
    if (selectedAccountData?.positions) {
      const totalPnL = selectedAccountData.positions.reduce((sum, position) => {
        return sum + Number(position.profit);
      }, 0);

      // Determine if PnL is going up or down
      if (prevNetPnLRef.current !== 0) {
        if (totalPnL > prevNetPnLRef.current) {
          setPnlChange("up");
        } else if (totalPnL < prevNetPnLRef.current) {
          setPnlChange("down");
        }

        // Reset after 2 seconds
        setTimeout(() => setPnlChange(null), 2000);
      }

      prevNetPnLRef.current = totalPnL;
      setNetPnL(totalPnL);

      // Calculate PnL by symbol
      const symbolPnL: Record<string, number> = {};
      selectedAccountData.positions.forEach((position) => {
        const symbol = position.symbol;
        const profit = Number(position.profit);

        if (!symbolPnL[symbol]) {
          symbolPnL[symbol] = 0;
        }

        symbolPnL[symbol] += profit;
      });

      setPnlBySymbol(symbolPnL);
    } else {
      setNetPnL(0);
      setPnlBySymbol({});
      prevNetPnLRef.current = 0;
    }
  }, [selectedAccountData?.positions]);

  // Enhanced helper functions for updating state based on WebSocket messages
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateAccountInfo = (data: any) => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((account) =>
        account.accountId === data.accountId
          ? {
              ...account,
              accountInfo: data.accountInformation || account.accountInfo,
            }
          : account
      )
    );
  };

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePositions = (data: any) => {
    // More sophisticated position update logic
    if (data.event === "positionUpdated" && data.position) {
      console.log("Real position update received for:", data.positionId);

      setAccounts((prevAccounts) =>
        prevAccounts.map((account) => {
          if (account.accountId !== data.accountId) return account;

          // Find the position to update
          const positions = account.positions || [];
          const updatedPositions = positions.map((pos) => {
            if (pos.id === data.positionId) {
              const newPrice = data.position.currentPrice || pos.currentPrice;
              const priceChange =
                newPrice > pos.currentPrice
                  ? "up"
                  : newPrice < pos.currentPrice
                  ? "down"
                  : null;

              // Log real data
              console.log(
                `Real price update: Symbol=${pos.symbol}, Old=${pos.currentPrice}, New=${newPrice}, Change=${priceChange}`
              );

              return {
                ...pos,
                ...data.position,
                lastUpdate: Date.now(),
                priceChange,
                // Reset tick direction when we get a real update
                tickDirection: null,
                isRealData: true, // Mark as real data from server
              };
            }
            return pos;
          });

          return {
            ...account,
            positions: updatedPositions,
          };
        })
      );

      setLastPriceUpdate(Date.now());
    } else if (data.event === "positionRemoved") {
      console.log("Position removed:", data.positionId);
      setAccounts((prevAccounts) =>
        prevAccounts.map((account) => {
          if (account.accountId !== data.accountId) return account;

          return {
            ...account,
            positions: (account.positions || []).filter(
              (p) => p.id !== data.positionId
            ),
          };
        })
      );
    } else if (data.event === "positionsUpdated") {
      // Full positions update - these are all real positions from the server
      console.log("All positions updated for account:", data.accountId);
      // Mark all positions as real data
      if (data.positions) {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.positions = data.positions.map((pos: any) => ({
          ...pos,
          isRealData: true,
          lastUpdate: Date.now(),
        }));
      }
      refreshAccountDetails(data.accountId);
    }
  };

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateOrders = (data: any) => {
    // Simplified - in a real app you'd update the specific order
    refreshAccountDetails(data.accountId);
  };

  const refreshAccounts = async () => {
    try {
      const response = await fetch(`${config.server}/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error(
        "Error refreshing accounts:",
        err instanceof Error ? err.message : err
      );
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutError(null);
      console.log(logoutError)
      setIsLoggingOut(true);

      // Assuming your useAuth hook has a logout method
      await logout(); // Replace with your actual logout method from useAuth
      router.push("/login");
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : "Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Update refreshAccountDetails to include a source parameter to log where the refresh came from
  const refreshAccountDetails = useCallback(
    async (accountId: string, source: "auto" | "manual" = "manual") => {
      // Don't start a new refresh if one is already in progress
      if (isRefreshing) return;

      try {
        console.log(
          `Refreshing account details for ${accountId} (${source} refresh)`
        );
        setIsRefreshing(true);

        const response = await fetch(`${config.server}/accounts/${accountId}`);
        if (response.ok) {
          const data = await response.json();

          // Mark positions as real data
          if (data.positions) {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.positions = data.positions.map((pos: any) => ({
              ...pos,
              isRealData: true,
              lastUpdate: Date.now(),
            }));
          }

          setAccounts((prevAccounts) =>
            prevAccounts.map((account) =>
              account.accountId === accountId
                ? { ...account, ...data }
                : account
            )
          );

          // Set the last real data update timestamp
          setLastRealDataUpdate(Date.now());
          console.log(`Refresh complete for ${accountId} (${source} refresh)`);
        }
      } catch (err) {
        console.error(
          `Error refreshing account ${accountId} (${source} refresh):`,
          err instanceof Error ? err.message : err
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [isRefreshing]
  );

  // Update the effect to use the source parameter
  useEffect(() => {
    if (!autoRefreshEnabled || !selectedAccount) return;

    console.log("Auto-refresh enabled for account:", selectedAccount);

    // Set up an interval to refresh the account data
    const refreshInterval = setInterval(async () => {
      if (selectedAccount) {
        try {
          await refreshAccountDetails(selectedAccount, "auto");
        } catch (error) {
          console.error("Auto-refresh error:", error);
        }
      }
    }, 3500); // 3.5 seconds

    // Clean up the interval when the component unmounts or dependencies change
    return () => {
      console.log("Auto-refresh disabled or account changed");
      clearInterval(refreshInterval);
    };
  }, [selectedAccount, autoRefreshEnabled, refreshAccountDetails]);

  // Then define the other functions that use refreshAccountDetails
  // Function to fetch and view the details of a specific account
  const viewAccountDetails = async (accountId: string) => {
    setSelectedAccount(accountId);
    await refreshAccountDetails(accountId);
  };

  // Function to add a new trading account
  const addAccount = async (formData: AccountFormData): Promise<boolean> => {
    try {
      // Validate form data
      if (!formData.login || !formData.server || !formData.password) {
        throw new Error("All required fields must be filled");
      }

      const response = await fetch(`${config.server}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to add account" }));
        throw new Error(errorData.error || "Failed to add account");
      }

      await refreshAccounts();
      return true;
    } catch (err) {
      console.error(
        "Error adding account:",
        err instanceof Error ? err.message : err
      );
      throw err;
    }
  };

  // Function to disconnect/remove an account
  const removeAccount = async (accountId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${config.server}/accounts/${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove account");
      }

      await refreshAccounts();
      if (selectedAccount === accountId) {
        setSelectedAccount(accounts.length > 1 ? accounts[0].accountId : null);
      }
    } catch (err) {
      console.error(
        "Error removing account:",
        err instanceof Error ? err.message : err
      );
      throw err;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center text-white bg-gradient-to-r from-white via-gray-400 to-gray-800 bg-clip-text text-transparent">
          EarningEdge Dashboard
        </h1>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-4">
            <p className="text-sm">
              {wsConnected ? (
                <span className="text-emerald-400">● WebSocket Connected</span>
              ) : (
                <span className="text-red-400">● WebSocket Disconnected</span>
              )}
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-400">
                Last update: {new Date(lastPriceUpdate).toLocaleTimeString()}
              </p>
              {lastRealDataUpdate && (
                <p
                  className="text-xs text-blue-400"
                  title="Last time real data was fetched from server"
                >
                  Real data: {new Date(lastRealDataUpdate).toLocaleTimeString()}
                </p>
              )}
              <div className="flex items-center space-x-2">
                <button
                  className={`text-xs px-2 py-1 rounded transition-colors duration-300 ${
                    realTimeEnabled
                      ? "bg-emerald-800 text-emerald-300 hover:bg-emerald-700"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                  title="Enable/disable live price interpolation between server updates"
                >
                  <span className="flex items-center">
                    {realTimeEnabled ? (
                      <>
                        <span className="inline-block h-2 w-2 bg-emerald-400 rounded-full animate-pulse mr-1"></span>
                        Real-time Enhanced
                      </>
                    ) : (
                      "Server Updates Only"
                    )}
                  </span>
                </button>
                <button
                  className={`text-xs px-2 py-1 rounded transition-colors duration-300 ${
                    autoRefreshEnabled
                      ? "bg-blue-800 text-blue-300 hover:bg-blue-700"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  title={
                    autoRefreshEnabled
                      ? "Disable auto-refresh"
                      : "Enable auto-refresh every 3.5 seconds"
                  }
                >
                  <span className="flex items-center">
                    {autoRefreshEnabled ? (
                      <>
                        <span className="inline-block h-2 w-2 bg-blue-400 rounded-full animate-pulse mr-1"></span>
                        Auto (3.5s)
                        {isRefreshing && (
                          <span className="ml-1 text-xs">↻</span>
                        )}
                      </>
                    ) : (
                      "Auto Off"
                    )}
                  </span>
                </button>
                <button
                  className={`bg-blue-700 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition-colors duration-300 flex items-center ${
                    isRefreshing ? "opacity-50" : ""
                  }`}
                  onClick={() =>
                    selectedAccount && refreshAccountDetails(selectedAccount)
                  }
                  disabled={!selectedAccount || isRefreshing}
                  title="Fetch latest data from server"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 mr-1 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {isRefreshing ? "Refreshing..." : "Manual Refresh"}
                </button>
              </div>
            </div>
          </div>
          <button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-200"
            onClick={() => setIsModalOpen(true)}
          >
            Add Account
          </button>
        </div>
      </header>

      {/* Account Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addAccount}
      />

      {loading ? (
        <div className="text-center py-10 text-gray-300">
          Loading accounts...
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Accounts Sidebar */}
          <div className="md:col-span-1 bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">
              Trading Accounts
            </h2>
            {accounts.length === 0 ? (
              <p className="text-gray-400">
                No accounts connected. Add an account to get started.
              </p>
            ) : (
              <ul className="space-y-2">
                {accounts.map((account) => (
                  <li
                    key={account.accountId}
                    className={`p-3 rounded-md cursor-pointer transition duration-200 ${
                      selectedAccount === account.accountId
                        ? "bg-blue-900/30 border-l-4 border-blue-500"
                        : "hover:bg-gray-800 border-l-4 border-transparent"
                    }`}
                    onClick={() => viewAccountDetails(account.accountId)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">
                          {account.accountInfo?.name ||
                            `Account ${account.accountId.slice(0, 8)}...`}
                        </p>
                        <p className="text-sm text-gray-400">
                          {account.accountInfo?.login}
                        </p>
                      </div>
                      <div
                        className={`h-3 w-3 rounded-full ${
                          account.connectedToBroker
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto pt-4 border-t border-gray-800">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full bg-gray-800 hover:bg-red-800/50 text-red-400 py-2 px-4 rounded-md flex items-center justify-center transition-all duration-300"
              >
                {isLoggingOut ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                    >
                      {/* Loading spinner SVG */}
                    </svg>
                    Logging Out...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Log Out
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            {selectedAccountData ? (
              <div>
                {/* Account Overview */}
                <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedAccountData.accountInfo?.name ||
                        `Account ${selectedAccountData.accountId.slice(
                          0,
                          8
                        )}...`}
                    </h2>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-200"
                      onClick={() =>
                        removeAccount(selectedAccountData.accountId)
                      }
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                      <p className="text-gray-400 text-sm">Balance</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedAccountData.accountInfo?.balance?.toFixed(2) ||
                          "0.00"}
                      </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                      <p className="text-gray-400 text-sm">Equity</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedAccountData.accountInfo?.equity?.toFixed(2) ||
                          "0.00"}
                      </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                      <p className="text-gray-400 text-sm">Margin Level</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedAccountData.accountInfo?.marginLevel?.toFixed(
                          2
                        ) || "0.00"}
                        %
                      </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                      <div className="flex justify-between items-center">
                        <p className="text-gray-400 text-sm">Data Quality</p>
                        {autoRefreshEnabled && (
                          <span
                            className={`text-xs ${
                              isRefreshing ? "text-blue-300" : "text-blue-400"
                            } ${
                              isRefreshing ? "animate-bounce" : "animate-pulse"
                            }`}
                          >
                            {isRefreshing ? "Refreshing..." : "Auto"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        {lastRealDataUpdate && (
                          <>
                            <div
                              className={`h-3 w-3 rounded-full ${
                                isRefreshing
                                  ? "bg-blue-500"
                                  : Date.now() - lastRealDataUpdate < 4000
                                  ? "bg-emerald-500"
                                  : Date.now() - lastRealDataUpdate < 10000
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                            ></div>
                            <span className="ml-2 text-white">
                              {isRefreshing
                                ? "Refreshing"
                                : Date.now() - lastRealDataUpdate < 4000
                                ? "Real-time"
                                : Date.now() - lastRealDataUpdate < 10000
                                ? "Recent"
                                : "Stale"}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {lastRealDataUpdate
                          ? isRefreshing
                            ? "Refreshing now..."
                            : `Updated ${Math.floor(
                                (Date.now() - lastRealDataUpdate) / 1000
                              )}s ago`
                          : "No data yet"}
                      </p>
                    </div>
                    <div
                      className={`bg-gray-800 p-4 rounded-md border ${
                        netPnL >= 0
                          ? "border-emerald-700 bg-emerald-900/20"
                          : "border-rose-700 bg-rose-900/20"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <p className="text-gray-400 text-sm">Net P&L</p>
                          {realTimeEnabled && (
                            <span className="ml-2 text-xs text-gray-500 animate-pulse">
                              Live
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          {pnlChange === "up" && (
                            <span className="text-emerald-400 text-sm animate-pulse">
                              ▲
                            </span>
                          )}
                          {pnlChange === "down" && (
                            <span className="text-rose-400 text-sm animate-pulse">
                              ▼
                            </span>
                          )}
                          <span
                            className="text-blue-400 text-xs"
                            title="Based on real server data"
                          >
                            ✓
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-2xl font-bold ${
                          netPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                        } ${
                          realTimeEnabled ? "transition-all duration-300" : ""
                        }`}
                      >
                        {netPnL.toFixed(2)}
                      </p>
                      {pnlHistory.length > 1 && (
                        <div className="mt-1">
                          <SparkLine
                            data={pnlHistory.map((item) => item.value)}
                            color={netPnL >= 0 ? "#34d399" : "#fb7185"}
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>
                              {new Date(
                                pnlHistory[0].timestamp
                              ).toLocaleTimeString()}
                            </span>
                            <span>Update: 5s</span>
                            <span>
                              {new Date(
                                pnlHistory[pnlHistory.length - 1].timestamp
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PnL By Symbol */}
                {Object.keys(pnlBySymbol).length > 0 && (
                  <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800 mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-white">
                      P&L by Symbol
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(pnlBySymbol).map(([symbol, profit]) => {
                        const hasHistory =
                          pnlHistoryBySymbol[symbol]?.length > 1;

                        // Check if this symbol has real data
                        const hasRealData =
                          selectedAccountData?.positions?.some(
                            (pos) => pos.symbol === symbol && pos.isRealData
                          );

                        return (
                          <div
                            key={symbol}
                            className={`p-4 rounded-md border ${
                              profit >= 0
                                ? "border-emerald-700 bg-emerald-900/10"
                                : "border-rose-700 bg-rose-900/10"
                            }`}
                          >
                            <div className="flex justify-between">
                              <p className="text-sm font-medium text-gray-300">
                                {symbol}
                              </p>
                              {hasRealData ? (
                                <span
                                  className="text-blue-400 text-xs"
                                  title="Based on real server data"
                                >
                                  ✓
                                </span>
                              ) : (
                                <span
                                  className="text-gray-500 text-xs"
                                  title="Estimated value"
                                >
                                  ~
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xl font-bold ${
                                profit >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {profit.toFixed(2)}
                            </p>
                            {hasHistory && (
                              <SparkLine
                                data={pnlHistoryBySymbol[symbol].map(
                                  (item) => item.value
                                )}
                                color={profit >= 0 ? "#34d399" : "#fb7185"}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Positions */}
                <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800 mb-6">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Open Positions
                  </h3>
                  {selectedAccountData.positions &&
                  selectedAccountData.positions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Symbol
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Volume
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Open Price
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Current Price
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Profit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {selectedAccountData.positions.map((position) => (
                            <tr
                              key={position.id}
                              className={`hover:bg-gray-800/50 ${
                                position.lastUpdate &&
                                Date.now() - position.lastUpdate < 3000
                                  ? position.priceChange === "up"
                                    ? "bg-emerald-900/20 transition-colors duration-1000"
                                    : position.priceChange === "down"
                                    ? "bg-rose-900/20 transition-colors duration-1000"
                                    : ""
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {position.symbol}
                              </td>
                              <td
                                className={`px-4 py-2 whitespace-nowrap ${
                                  position.type === "POSITION_TYPE_BUY"
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {position.type === "POSITION_TYPE_BUY"
                                  ? "BUY"
                                  : "SELL"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {position.volume}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {position.openPrice}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300 flex items-center">
                                <span
                                  className={`transition-colors duration-300 ${
                                    position.tickDirection
                                      ? position.tickDirection === "up"
                                        ? "text-emerald-400 font-medium"
                                        : "text-rose-400 font-medium"
                                      : ""
                                  }`}
                                >
                                  {Number(position.currentPrice).toFixed(5)}
                                  {position.isRealData ? (
                                    <span
                                      className="ml-1 text-xs text-blue-400"
                                      title="Real data from server"
                                    >
                                      ✓
                                    </span>
                                  ) : realTimeEnabled ? (
                                    <span
                                      className="ml-1 text-xs text-gray-500"
                                      title="Estimated value"
                                    >
                                      ~
                                    </span>
                                  ) : null}
                                </span>
                                {position.priceChange === "up" &&
                                  position.lastUpdate &&
                                  Date.now() - position.lastUpdate < 3000 && (
                                    <span className="ml-1 text-emerald-400 animate-pulse">
                                      ▲
                                    </span>
                                  )}
                                {position.priceChange === "down" &&
                                  position.lastUpdate &&
                                  Date.now() - position.lastUpdate < 3000 && (
                                    <span className="ml-1 text-rose-400 animate-pulse">
                                      ▼
                                    </span>
                                  )}
                                {position.tickDirection &&
                                  position.lastTickTime &&
                                  Date.now() - position.lastTickTime < 800 && (
                                    <span
                                      className={`ml-1 ${
                                        position.tickDirection === "up"
                                          ? "text-emerald-400"
                                          : "text-rose-400"
                                      } text-xs animate-ping opacity-75`}
                                    >
                                      {position.tickDirection === "up"
                                        ? "•"
                                        : "•"}
                                    </span>
                                  )}
                              </td>
                              <td
                                className={`px-4 py-2 whitespace-nowrap font-semibold transition-colors duration-300 ${
                                  Number(position.profit) >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                <span
                                  className={
                                    position.tickDirection
                                      ? "animate-pulse"
                                      : ""
                                  }
                                >
                                  {Number(position.profit).toFixed(2)}
                                  {!position.isRealData && realTimeEnabled && (
                                    <span
                                      className="ml-1 text-xs text-gray-500"
                                      title="Estimated value"
                                    >
                                      ~
                                    </span>
                                  )}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400">No open positions</p>
                  )}
                </div>

                {/* Orders */}
                <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Pending Orders
                  </h3>
                  {selectedAccountData.orders &&
                  selectedAccountData.orders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Symbol
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Volume
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {selectedAccountData.orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-800/50">
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {order.id}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {order.symbol}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {order.type}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {order.volume}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {order.openPrice}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-300">
                                {order.state}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400">No pending orders</p>
                  )}
                </div>

                {/* Legend for Data Indicators */}
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 my-4 text-xs">
                  <h4 className="font-medium text-white mb-2">Data Legend:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex items-center">
                      <span className="text-blue-400 mr-1">✓</span>
                      <span className="text-gray-300">
                        Real data from server
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">~</span>
                      <span className="text-gray-300">
                        Estimated value (between server updates)
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-emerald-400 mr-1">▲</span>
                      <span className="text-gray-300">
                        Price/value increased
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-800 text-center">
                <p className="text-gray-400">
                  {accounts.length > 0
                    ? "Select an account to view details"
                    : "No accounts connected. Add an account to get started."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
