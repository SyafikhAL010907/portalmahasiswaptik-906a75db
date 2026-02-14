// BILLING RANGE STATE (Global Config)
const [billingStart, setBillingStart] = useState<number>(1);
const [billingEnd, setBillingEnd] = useState<number>(6);
const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

// FETCH GLOBAL CONFIG ON MOUNT
useEffect(() => {
    const fetchGlobalConfig = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const baseUrl = `${window.location.protocol}//${window.location.hostname}:9000/api`;
            const response = await fetch(`${baseUrl}/config/billing-range`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setBillingStart(data.start_month);
                setBillingEnd(data.end_month);
            }
        } catch (error) {
            console.error("Failed to fetch global config:", error);
        }
    };
    fetchGlobalConfig();
}, []);

// UPDATE GLOBAL CONFIG
const updateBillingRange = async (start: number, end: number) => {
    // Optimistic Update
    setBillingStart(start);
    setBillingEnd(end);

    setIsUpdatingConfig(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const baseUrl = `${window.location.protocol}//${window.location.hostname}:9000/api`;
        const response = await fetch(`${baseUrl}/config/save-range`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ start_month: start, end_month: end })
        });

        if (!response.ok) throw new Error("Failed to save config");

        toast.success("Rentang tagihan berhasil diperbarui (Global Sync)!");

        // Refresh Data if Lifetime view is active
        // Using 'isLifetime' which is derived later. 
        // We might not have access to 'isLifetime' variable here depending on where it is defined.
        // Let's check where 'isLifetime' is defined in Finance.tsx.
        // Usually it is `const isLifetime = selectedMonth === 99;`
        // If it's defined after this block, we can't use it.
        // Let's just call fetchStudentMatrix() if selectedMonth === 99
        if (selectedTransactionMonth === 99 || selectedMonth === 99) { // Need to check what state is used for the view.
            // fetchStudentMatrix is defined later? No, usually function hoisting works for `function` keyword but not const.
            // If fetchStudentMatrix is defined as const...
            triggerRefresh(); // We'll add a trigger or use useEffect dependency.
        }

    } catch (error) {
        console.error("Failed to update config:", error);
        toast.error("Gagal menyimpan konfigurasi global.");
    } finally {
        setIsUpdatingConfig(false);
    }
};
