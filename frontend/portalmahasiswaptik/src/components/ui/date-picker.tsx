import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { id } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    required?: boolean
}

export function DatePicker({
    date,
    setDate,
    placeholder = "Pilih tanggal",
    className,
    required
}: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative w-full">
                    <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5 z-10" />
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-medium pl-12 pr-4 py-3 h-auto",
                            "bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700",
                            "text-slate-900 dark:text-white rounded-xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                            "focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all",
                            !date && "text-slate-400",
                            className
                        )}
                        type="button"
                    >
                        {date ? format(date, "d MMMM yyyy", { locale: id }) : <span>{placeholder}</span>}
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={id}
                />
            </PopoverContent>
        </Popover>
    )
}
