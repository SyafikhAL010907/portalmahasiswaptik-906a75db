import { useState, useMemo } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, getISOWeek, startOfISOWeek, endOfISOWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Activity, BarChart3, LineChart, CandlestickChart } from 'lucide-react';
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group";

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
    weeklyDues: any[];
    className?: string;
    filter?: 'all' | 'income' | 'expense';
}

export function FinancialChart({ transactions, weeklyDues, className, filter = 'all' }: FinancialChartProps) {
    const [chartType, setChartType] = useState<'linear' | 'step'>('linear');
    const [timeRange, setTimeRange] = useState<'1D' | '1W' | '4W' | '1M' | 'All'>('All');

    // REAL DATA PROCESSING
    const chartData = useMemo(() => {
        // 1. Combine Data Sources
        const allEvents = [
            ...transactions.map(t => ({
                date: new Date(t.transaction_date),
                amount: t.type === 'income' ? t.amount : -t.amount,
                type: t.type,
                description: t.description,
                original: t
            })),
            ...weeklyDues.map(d => ({
                date: new Date(d.paid_at || new Date().toISOString()),
                amount: 5000,
                type: 'income',
                description: `Iuran Minggu ke-${d.week_number}`,
                original: d
            }))
        ];

        // 2. Sort Chronologically
        allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

        // 3. Configure Time Range
        const now = new Date();
        let startDate = new Date(0); // Default 'All' = beginning of time

        if (timeRange === '1D') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (timeRange === '1W') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (timeRange === '4W' || timeRange === '1M') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 4. Process Running Balance & Filtering
        const dataPoints: any[] = [];
        let runningBalance = 0;
        let cumulativeFilterValue = 0;

        // Iterate through ALL events to calculate correct running balance up to now
        allEvents.forEach(event => {
            runningBalance += event.amount;

            // Filter Logic per Event (for specific filters like 'income' or 'expense' only lines)
            if (filter === 'income' && event.amount > 0) cumulativeFilterValue += event.amount;
            else if (filter === 'expense' && event.amount < 0) cumulativeFilterValue += Math.abs(event.amount);

            // Only add to chart if within selected time range
            if (event.date >= startDate) {
                const dateKey = timeRange === '1D'
                    ? format(event.date, 'HH:mm')
                    : format(event.date, 'd MMM');

                // Grouping by Date Key (take the last value of the period)
                const lastPoint = dataPoints[dataPoints.length - 1];

                let balanceToShow = runningBalance;
                if (filter === 'income' || filter === 'expense') balanceToShow = cumulativeFilterValue;

                if (lastPoint && lastPoint.weekLabel === dateKey) {
                    lastPoint.balance = balanceToShow; // Update to latest balance of the day/hour
                    if (event.amount > 0) lastPoint.income += event.amount;
                    else lastPoint.expense += Math.abs(event.amount);
                    lastPoint.events.push(event);
                } else {
                    dataPoints.push({
                        date: event.date.toISOString(),
                        weekLabel: dateKey,
                        balance: balanceToShow,
                        income: event.amount > 0 ? event.amount : 0,
                        expense: event.amount < 0 ? Math.abs(event.amount) : 0,
                        events: [event]
                    });
                }
            }
        });

        // Ensure we have at least one point if empty (e.g. at start of filtered range)
        if (dataPoints.length === 0 && allEvents.length > 0) {
            // Add a starting point with current running balance
            dataPoints.push({
                date: startDate.toISOString(),
                weekLabel: format(startDate, 'd MMM'),
                balance: filter === 'all' ? runningBalance : cumulativeFilterValue,
                income: 0,
                expense: 0,
                events: []
            });
        }

        return dataPoints;
    }, [transactions, weeklyDues, timeRange, filter]);

    // Determine Trend Color
    const isUptrend = chartData.length > 1
        ? chartData[chartData.length - 1].balance >= chartData[0].balance
        : true;

    // Override trend color based on filter
    const trendColor = filter === 'income' ? "#10b981" : filter === 'expense' ? "#f43f5e" : (isUptrend ? "#10b981" : "#f43f5e");

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-popover/90 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl text-xs max-w-[280px]">
                    <p className="font-bold text-base mb-2">
                        {data.weekLabel}
                    </p>

                    <div className="space-y-1 mb-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Saldo Akhir:</span>
                            <span className="font-bold" style={{ color: trendColor }}>Rp {data.balance.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-green-500">
                            <span>Total Masuk:</span>
                            <span>+Rp {data.income.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-red-500">
                            <span>Total Keluar:</span>
                            <span>-Rp {data.expense.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {data.events.length > 0 && (
                        <div className="border-t border-border pt-2 mt-2">
                            <p className="text-muted-foreground font-semibold mb-1 xs">Aktivitas Utama:</p>
                            <ul className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                {data.events.slice(0, 3).map((e: any, idx: number) => (
                                    <li key={idx} className="flex justify-between gap-2">
                                        <span className="truncate max-w-[140px] text-muted-foreground">{e.description}</span>
                                        <span className={e.type === 'income' ? 'text-green-500' : 'text-red-500'}>
                                            {e.type === 'income' ? '+' : '-'}Rp {Math.abs(e.amount).toLocaleString('id-ID')}
                                        </span>
                                    </li>
                                ))}
                                {data.events.length > 3 && (
                                    <li className="text-center text-muted-foreground italic text-[10px]">
                                        +{data.events.length - 3} aktivitas lain
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-2">
                <div className="space-y-1 w-full sm:w-auto">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        {isUptrend ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                        Financial Analytics
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Tren saldo <span className={isUptrend ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                            {isUptrend ? "Naik" : "Turun"}
                        </span> mengikuti arus kas realtime
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <ToggleGroup type="single" value={chartType} onValueChange={(val: any) => { if (val) setChartType(val) }} className="bg-muted/30 p-1 rounded-lg border border-border/50">
                        <ToggleGroupItem value="linear" className="text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white h-7 px-3 rounded-md transition-all">
                            Line
                        </ToggleGroupItem>
                        <ToggleGroupItem value="step" className="text-xs data-[state=on]:bg-emerald-500 data-[state=on]:text-white h-7 px-3 rounded-md transition-all">
                            Step Line
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
            <CardContent className="pt-4 px-2 sm:px-6">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                            <XAxis
                                dataKey="weekLabel"
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
                                tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type={chartType === 'linear' ? "linear" : "step"}
                                dataKey="balance"
                                stroke={trendColor}
                                fillOpacity={1}
                                fill="url(#colorTrend)"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0, fill: trendColor }}
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex justify-center gap-2 mt-4 pb-2">
                    {['1D', '1W', '1M', 'All'].map((range) => (
                        <Button
                            key={range}
                            variant={timeRange === range ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeRange(range as any)}
                            className={`h-7 px-4 text-xs font-medium rounded-full ${timeRange === range ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {range === '1D' ? '1 Hari' : range === '1W' ? '1 Minggu' : range === '1M' ? '1 Bulan' : 'Semua'}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
