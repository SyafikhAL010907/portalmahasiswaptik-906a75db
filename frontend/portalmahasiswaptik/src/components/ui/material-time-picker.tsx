import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MaterialTimePickerProps {
    time: string; // Format "HH:mm"
    onChange: (time: string) => void;
    onClose: () => void;
    onClear: () => void;
}

type Mode = "hours" | "minutes";

export function MaterialTimePicker({ time, onChange, onClose, onClear }: MaterialTimePickerProps) {
    const [mode, setMode] = useState<Mode>("hours");

    // Parse initial time
    const initialTime = time ? time.split(":") : ["00", "00"];
    const [hours, setHours] = useState<number>(parseInt(initialTime[0]) || 0);
    const [minutes, setMinutes] = useState<number>(parseInt(initialTime[1]) || 0);

    const dialRef = useRef<HTMLDivElement>(null);

    const [isDragging, setIsDragging] = useState(false);

    // Constants for dial rendering
    const CLOCK_RADIUS = 100;
    const INNER_RADIUS = 65; // For 13-00 hours
    const HAND_ORIGIN_X = 125;
    const HAND_ORIGIN_Y = 125;

    const calculateTimeFromAngle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!dialRef.current) return;
        const rect = dialRef.current.getBoundingClientRect();

        let clientX, clientY;
        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate angle (-180 to 180)
        let angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);

        // Shift so 0 is at 12 o'clock, growing clockwise
        angle = angle + 90;
        if (angle < 0) angle += 360;

        // Distance from center
        const distance = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));

        if (mode === "hours") {
            let selectedHour = Math.round(angle / 30) % 12;

            // Determine if inner or outer circle based on distance
            // If distance is less than a threshold, we select 13-00 (00=24)
            const isInner = distance < (CLOCK_RADIUS + INNER_RADIUS) / 2;

            if (isInner) {
                selectedHour = selectedHour === 0 ? 0 : selectedHour + 12; // 00 instead of 24
            } else {
                selectedHour = selectedHour === 0 ? 12 : selectedHour; // Outer is 1-12
            }
            setHours(selectedHour);
        } else {
            // Minutes
            let selectedMinute = Math.round(angle / 6) % 60;
            setMinutes(selectedMinute);
        }
    };

    // Mouse / Touch Handlers
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        calculateTimeFromAngle(e);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
        if (isDragging) {
            calculateTimeFromAngle(e);
        }
    };

    const handlePointerUp = () => {
        if (isDragging) {
            setIsDragging(false);
            if (mode === "hours") {
                // Auto switch to minutes after selecting hour
                setTimeout(() => setMode("minutes"), 300);
            }
        }
    };

    // Global listeners for dragging outside container
    useEffect(() => {
        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);
        window.addEventListener("touchmove", handlePointerMove, { passive: false });
        window.addEventListener("touchend", handlePointerUp);

        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
            window.removeEventListener("touchmove", handlePointerMove);
            window.removeEventListener("touchend", handlePointerUp);
        };
    }, [isDragging, mode]);

    // Derived state for display
    const displayHours = hours.toString().padStart(2, '0');
    const displayMinutes = minutes.toString().padStart(2, '0');

    // Angle calculations for the hand
    const currentAngle = mode === "hours"
        ? (hours % 12) * 30
        : minutes * 6;

    // Hand length logic for inner/outer hour ring
    const isInnerHour = mode === "hours" && (hours === 0 || hours > 12);
    const handLength = isInnerHour ? INNER_RADIUS : CLOCK_RADIUS - 15;

    const handleSet = () => {
        onChange(`${displayHours}:${displayMinutes}`);
        onClose();
    };

    // Generate numbers for the dial
    const renderDialNumbers = () => {
        const numbers = [];
        if (mode === "hours") {
            // Outer ring: 1-12
            for (let i = 1; i <= 12; i++) {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = HAND_ORIGIN_X + Math.cos(angle) * (CLOCK_RADIUS - 15);
                const y = HAND_ORIGIN_Y + Math.sin(angle) * (CLOCK_RADIUS - 15);
                numbers.push(
                    <div key={`outer-${i}`} className={cn("absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        hours === i ? "text-white" : "text-slate-800 dark:text-slate-200"
                    )} style={{ left: x, top: y }}>
                        {i}
                    </div>
                );
            }
            // Inner ring: 13-00
            for (let i = 13; i <= 24; i++) {
                const displayVal = i === 24 ? 0 : i;
                const stringVal = displayVal.toString().padStart(2, '0');
                const angle = ((displayVal % 12) * 30 - 90) * (Math.PI / 180);
                const x = HAND_ORIGIN_X + Math.cos(angle) * INNER_RADIUS;
                const y = HAND_ORIGIN_Y + Math.sin(angle) * INNER_RADIUS;
                numbers.push(
                    <div key={`inner-${i}`} className={cn("absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                        hours === displayVal ? "text-white" : "text-slate-500 dark:text-slate-400"
                    )} style={{ left: x, top: y }}>
                        {stringVal}
                    </div>
                );
            }
        } else {
            // Minutes: 0, 5, 10, ... 55
            for (let i = 0; i < 60; i += 5) {
                const angle = (i * 6 - 90) * (Math.PI / 180);
                const x = HAND_ORIGIN_X + Math.cos(angle) * (CLOCK_RADIUS - 15);
                const y = HAND_ORIGIN_Y + Math.sin(angle) * (CLOCK_RADIUS - 15);
                numbers.push(
                    <div key={`min-${i}`} className={cn("absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                        minutes === i ? "text-white" : "text-slate-800 dark:text-slate-200"
                    )} style={{ left: x, top: y }}>
                        {i.toString().padStart(2, '0')}
                    </div>
                );
            }
        }
        return numbers;
    };

    return (
        <div className="flex flex-col w-full max-w-[300px] sm:max-w-[320px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">

            {/* Header Area */}
            <div className="bg-primary pt-6 pb-4 px-6 flex flex-col items-center justify-center text-primary-foreground">
                <div className="text-sm font-medium mb-1 opacity-80">Pilih Waktu</div>
                <div className="flex items-baseline gap-1 text-5xl font-bold tracking-tight">
                    <span
                        className={cn("cursor-pointer px-2 py-1 rounded-lg transition-colors", mode === "hours" ? "bg-white/20" : "hover:bg-white/10 opacity-70")}
                        onClick={() => setMode("hours")}
                    >
                        {displayHours}
                    </span>
                    <span className="opacity-50 mb-2">:</span>
                    <span
                        className={cn("cursor-pointer px-2 py-1 rounded-lg transition-colors", mode === "minutes" ? "bg-white/20" : "hover:bg-white/10 opacity-70")}
                        onClick={() => setMode("minutes")}
                    >
                        {displayMinutes}
                    </span>
                </div>
            </div>

            {/* Clock Area */}
            <div className="p-4 sm:p-6 flex flex-col items-center bg-slate-50 dark:bg-slate-900">

                <div
                    className="relative w-[250px] h-[250px] rounded-full bg-slate-200 dark:bg-slate-800 touch-none select-none select-none-all"
                    ref={dialRef}
                    onMouseDown={handlePointerDown}
                    onTouchStart={handlePointerDown}
                >
                    {/* Center Dot */}
                    <div className="absolute w-2 h-2 rounded-full bg-primary left-1/2 top-1/2 -ml-1 -mt-1 z-20" />

                    {/* Hand Line & Outer Circle */}
                    <motion.div
                        className="absolute left-1/2 top-1/2 w-[2px] bg-primary origin-bottom z-10 pointer-events-none"
                        initial={false}
                        animate={{
                            rotate: currentAngle,
                            height: handLength,
                            y: -handLength
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
                    >
                        <div className="absolute -top-4 -left-[15px] w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10 pointer-events-none shadow-md">
                            {/* Only show exact minutes text inside the bubble if it's not a round 5 in minute mode, or not visible at all? In material design usually the bubble covers the number, we handle the color of that number separately via absolute positioning */}
                        </div>
                    </motion.div>

                    {/* Numbers Overlay */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 z-20 pointer-events-none"
                        >
                            {renderDialNumbers()}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900">
                <Button variant="ghost" size="sm" onClick={() => { onClear(); onClose(); }} className="text-slate-500">
                    Hapus
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-primary hover:text-primary hover:bg-primary/10">
                        Batal
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSet} className="text-primary hover:text-primary hover:bg-primary/10 font-bold">
                        Setel
                    </Button>
                </div>
            </div>
        </div>
    );
}
