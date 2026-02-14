
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface GlassConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const GlassConfirmationModal: React.FC<GlassConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full max-w-md p-6 bg-gray-900/90 border border-gray-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 scale-100 ring-1 ring-white/10">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-amber-500/10 rounded-full ring-1 ring-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
                        <AlertTriangle className="w-8 h-8 text-amber-500 drop-shadow-md" />
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
                                onClose();
                            }}
                            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Yakin, Lanjutkan
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlassConfirmationModal;
