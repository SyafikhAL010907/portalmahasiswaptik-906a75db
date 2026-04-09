
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';

interface GlassConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

const GlassConfirmationModal: React.FC<GlassConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = 'default',
    isLoading = false,
    icon
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full max-w-md p-6 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 scale-100 ring-1 ring-white/10">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={cn(
                      "p-3 rounded-full ring-1 shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
                      variant === 'destructive' ? "bg-rose-500/10 ring-rose-500/20" : "bg-amber-500/10 ring-amber-500/20"
                    )}>
                        {icon || <AlertTriangle className={cn("w-8 h-8 drop-shadow-md", variant === 'destructive' ? "text-rose-500" : "text-amber-500")} />}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed px-4">
                            {message}
                        </p>
                    </div>

                    <div className="flex gap-3 w-full pt-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-11 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl font-medium transition-all"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                onConfirm();
                            }}
                            disabled={isLoading}
                            className={cn(
                              "flex-1 h-11 border-0 rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                              variant === 'destructive' ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                            )}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yakin, Lanjutkan"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlassConfirmationModal;
