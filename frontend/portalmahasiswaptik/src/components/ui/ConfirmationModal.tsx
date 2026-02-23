import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Konfirmasi",
    cancelText = "Batal",
    variant = 'danger',
    isLoading = false
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <Trash2 className="w-6 h-6 text-red-500" />;
            case 'warning':
                return <AlertCircle className="w-6 h-6 text-yellow-500" />;
            case 'info':
                return <RefreshCw className="w-6 h-6 text-blue-500" />;
        }
    };

    const getConfirmButtonClass = () => {
        switch (variant) {
            case 'danger':
                return "bg-red-500 hover:bg-red-600 text-white";
            case 'warning':
                return "bg-yellow-500 hover:bg-yellow-600 text-black";
            case 'info':
                return "bg-blue-500 hover:bg-blue-600 text-white";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl pointer-events-auto relative overflow-hidden"
                        >
                            {/* Decorative gradient blob */}
                            <div className={cn(
                                "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20",
                                variant === 'danger' ? "bg-red-500" :
                                    variant === 'warning' ? "bg-yellow-500" : "bg-blue-500"
                            )} />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={cn(
                                        "p-3 rounded-full bg-opacity-10 backdrop-blur-md",
                                        variant === 'danger' ? "bg-red-500/20" :
                                            variant === 'warning' ? "bg-yellow-500/20" : "bg-blue-500/20"
                                    )}>
                                        {getIcon()}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                    {description}
                                </p>

                                <div className="flex gap-3 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="hover:bg-slate-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        {cancelText}
                                    </Button>
                                    <Button
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                        className={cn(getConfirmButtonClass(), "gap-2 min-w-[100px]")}
                                    >
                                        {isLoading ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        {confirmText}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
