import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import GroupScoped from "@/pages/GroupScoped";
import { BalancesView, SettlementsView } from "@/features/balances/BalancePanels";
import History from "@/pages/History";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="groups" element={<Groups />} />
            <Route path="groups/:id" element={<GroupDetail />} />
            <Route path="expenses/new" element={<AddExpense />} />
            <Route path="expenses/:eid/edit" element={<AddExpense />} />
            <Route path="balances" element={<GroupScoped title="Balances">{(id) => <BalancesView groupId={id} />}</GroupScoped>} />
            <Route path="settlements" element={<GroupScoped title="Settlements">{(id) => <SettlementsView groupId={id} />}</GroupScoped>} />
            <Route path="history" element={<History />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
