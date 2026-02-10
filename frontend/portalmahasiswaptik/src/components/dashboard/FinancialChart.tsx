import { useState, useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    description: string;
    amount: number;
    transaction_date: string;
    category: string;
    class_id?: string;
}

interface FinancialChartProps {
    transactions: Transaction[];
    selectedClassId: string;
    selectedClassName: string;
    currentSaldo: number; // Forced anchoring to card value
    className?: string;
}

type TimeRange = '1W' | '1M' | '6M' | '1Y' | 'ALL';

export function FinancialChart({ transactions, selectedClassId, selectedClassName, currentSaldo, className }: FinancialChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');

    // Process chart data based on selected class and time range
    const chartData = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
            case '1W': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case '1M': startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
            case '6M': startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
            case '1Y': startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
            default: startDate = new Date(0);
        }

        // 1. Filter transactions for selected class
        const classTransactions = transactions.filter(tx => tx.class_id === selectedClassId);

        // 2. 🎯 CALCULATE FORCED ALIGNMENT OFFSET
        // To sync perfectly with the card, we calculate how much the chart's total
        // sum differs from the authoritative currentSaldo.
        const totalTransactionSum = classTransactions.reduce((sum, tx) =>
            sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0
        );

        // This offset accounts for initial balances (Weekly Dues) not in transaction list
        const offset = currentSaldo - totalTransactionSum;

        // 3. GENERATE DAILY DATA POINTS
        const days = eachDayOfInterval({ start: startDate, end: now });

        let cumulativeBalance = offset;
        // Pre-calculate baseline for transactions BEFORE the window
        allTransactionsSorted().forEach(tx => {
            if (new Date(tx.transaction_date) < startDate) {
                cumulativeBalance += tx.type === 'income' ? tx.amount : -tx.amount;
            }
        });

        function allTransactionsSorted() {
            return [...classTransactions].sort((a, b) =>
                new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
            );
        }

        const dataPoints = days.map(day => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);

            const dayTransactions = classTransactions.filter(tx => {
                const txDate = new Date(tx.transaction_date);
                return txDate >= dayStart && txDate <= dayEnd;
            });

            const daySum = dayTransactions.reduce((sum, tx) =>
                sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0
            );

            cumulativeBalance += daySum;

            return {
                date: day.toISOString(),
                label: format(day, 'd MMM'),
                balance: cumulativeBalance,
                transactionCount: dayTransactions.length
            };
        });

        // Ensure the absolute final point is exactly currentSaldo
        if (dataPoints.length > 0) {
            dataPoints[dataPoints.length - 1].balance = currentSaldo;
        }

        return dataPoints;
    }, [transactions, selectedClassId, timeRange, currentSaldo]);

    const isUptrend = chartData.length > 1
        ? chartData[chartData.length - 1].balance >= chartData[0].balance
        : true;

    const trendColor = isUptrend ? "#10b981" : "#f43f5e";

    const formatRupiah = (value: number) => {
        const absValue = Math.abs(value);
        if (absValue >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
        if (absValue >= 1000) return `Rp ${(value / 1000).toFixed(0)}k`;
        return `Rp ${value}`;
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs">
                    <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-muted-foreground font-medium">Tanggal:</span>
                        <span className="font-bold">{format(new Date(data.date), 'd MMMM yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground font-medium">Saldo Bersih Lifetime:</span>
                        <span className="font-bold text-sm" style={{ color: trendColor }}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.balance)}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const timeRangeButtons: { value: TimeRange; label: string }[] = [
        { value: '1W', label: '1 Minggu' },
        { value: '1M', label: '1 Bulan' },
        { value: '6M', label: '6 Bulan' },
        { value: '1Y', label: '1 Tahun' },
        { value: 'ALL', label: 'Semua' },
    ];

    return (
        <Card className={cn("overflow-hidden border-border bg-card shadow-lg", className)}>
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Grafik Keuangan {selectedClassName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Sinkron dengan Saldo Bersih kartu
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-lg">
                        {timeRangeButtons.map((btn) => (
                            <Button
                                key={btn.value}
                                variant={timeRange === btn.value ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setTimeRange(btn.value)}
                                className={cn(
                                    "h-7 px-2.5 text-[10px] font-medium transition-all",
                                    timeRange === btn.value && "bg-background shadow-sm"
                                )}
                            >
                                {btn.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-2 sm:px-6">
                <div className="h-[300px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={trendColor} stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                            <XAxis
                                dataKey="label"
                                stroke="var(--muted-foreground)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="var(--muted-foreground)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatRupiah}
                                width={55}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke={trendColor}
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                                strokeWidth={2.5}
                                animationDuration={1000}
                                connectNulls
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
