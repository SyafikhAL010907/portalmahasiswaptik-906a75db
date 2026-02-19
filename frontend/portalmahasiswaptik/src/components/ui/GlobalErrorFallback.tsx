import { AlertTriangle, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GlobalErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

export function GlobalErrorFallback({ error, resetErrorBoundary }: GlobalErrorFallbackProps) {
    const isNetworkError = error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed to fetch");

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 text-center">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    {isNetworkError ? (
                        <WifiOff className="w-8 h-8 text-red-600 dark:text-red-400" />
                    ) : (
                        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    )}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {isNetworkError ? "Koneksi Terputus" : "Terjadi Kesalahan"}
                </h2>

                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {isNetworkError
                        ? "Sepertinya internet kamu sedang bermasalah atau server sedang padat."
                        : "Maaf, aplikasi mengalami masalah tak terduga."}
                </p>

                {process.env.NODE_ENV === 'development' && (
                    <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg text-xs font-mono text-left mb-6 overflow-auto max-h-32">
                        {error.message}
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                    >
                        Refesh Halaman
                    </Button>
                    <Button
                        onClick={resetErrorBoundary}
                        className="flex items-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Coba Lagi
                    </Button>
                </div>
            </div>
        </div>
    );
}
