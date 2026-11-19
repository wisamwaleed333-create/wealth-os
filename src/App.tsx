import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import {
  CategoryBudgetConfig,
  ExpenseCategory,
  NavSection,
  NetWorthAlertConfig,
  PendingModalAction,
  WealthSettings,
  WealthState,
} from './types/wealth';
import { EMPTY_WEALTH_STATE } from './data/seedData';
import { CURRENCY_LABELS, NAV_ITEMS } from './data/labels';
import {
  calculateNetWorthIQD,
  loadWealthState,
  saveWealthState,
} from './utils/finance';
import { evaluateBillReminders, generateSmartAlerts } from './utils/alerts';
import {
  applyThemeClass,
  loadThemeMode,
  saveThemeMode,
  ThemeMode,
  toggleThemeMode,
} from './utils/theme';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { IncomeView } from './components/IncomeView';
import { ExpensesView } from './components/ExpensesView';
import { AssetsLiabilitiesView } from './components/AssetsLiabilitiesView';
import { InvestmentsView } from './components/InvestmentsView';
import { ReportsView } from './components/ReportsView';
import { GoalsView } from './components/GoalsView';
import { AlertsView } from './components/AlertsView';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { QRAppLaunchModal } from './components/QRAppLaunchModal';
import { UpdatePromptBanner } from './components/UpdatePromptBanner';

export function App() {
  const [state, setState] = useState<WealthState>(() =>
    loadWealthState(EMPTY_WEALTH_STATE)
  );
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemeMode());
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingModalAction>(null);

  const isDark = theme === 'dark';

  const referenceDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const referenceMonthKey = referenceDateStr.slice(0, 7);

  // Automatically track peak net worth when autoUpdatePeak is enabled
  useEffect(() => {
    const currentIQD = calculateNetWorthIQD(state);
    if (
      state.netWorthAlert.autoUpdatePeak &&
      currentIQD > state.netWorthAlert.baselineNetWorthIQD
    ) {
      setState((prev) => ({
        ...prev,
        netWorthAlert: {
          ...prev.netWorthAlert,
          baselineNetWorthIQD: Math.round(currentIQD),
        },
      }));
    }
  }, [
    state.assets,
    state.investments,
    state.liabilities,
    state.settings.exchangeRateIQDPerUSD,
    state.netWorthAlert.autoUpdatePeak,
    state.netWorthAlert.baselineNetWorthIQD,
  ]);

  useEffect(() => {
    saveWealthState(state);
  }, [state]);

  useEffect(() => {
    applyThemeClass(theme);
    saveThemeMode(theme);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#060C18' : '#0B1526');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => toggleThemeMode(prev));
  };

  const activeAlerts = useMemo(
    () => generateSmartAlerts(state, referenceDateStr),
    [state, referenceDateStr]
  );

  const activeNav = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  const sectionSubtitles: Record<NavSection, string> = {
    dashboard: 'نظرة تنفيذية على صافي الثروة والتدفق النقدي',
    income: 'متابعة مصادر الدخل والرواتب والأرباح الدورية',
    expenses: 'تتبع المصروفات وسقوف الميزانية الشهرية',
    assets: 'إدارة الأصول السائلة والعينية والالتزامات',
    investments: 'تقييم المحفظة الاستثمارية والعائد التراكمي',
    reports: 'تحليلات الأداء، حاسبة التضخم، والسجل الشامل',
    goals: 'أهداف الادخار وحاسبة التخطيط المستقبلي',
    alerts: 'إدارة تذكيرات الفواتير وتنبيهات صافي الثروة',
  };

  const updateSettings = (next: Partial<WealthSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...next },
    }));
  };

  const handleTriggerAction = (action: Exclude<PendingModalAction, null>) => {
    setPendingAction(action);
    setActiveSection(action.section);
  };

  const handleDeleteRecord = (
    kind: 'income' | 'expense' | 'asset' | 'liability' | 'investment',
    id: string
  ) => {
    setState((prev) => {
      switch (kind) {
        case 'income':
          return { ...prev, incomes: prev.incomes.filter((i) => i.id !== id) };
        case 'expense':
          return { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) };
        case 'asset':
          return { ...prev, assets: prev.assets.filter((a) => a.id !== id) };
        case 'liability':
          return { ...prev, liabilities: prev.liabilities.filter((l) => l.id !== id) };
        case 'investment':
          return { ...prev, investments: prev.investments.filter((inv) => inv.id !== id) };
      }
    });
  };

  const handleSaveCategoryBudget = (
    category: ExpenseCategory,
    config: CategoryBudgetConfig
  ) => {
    setState((prev) => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [category]: config,
      },
      // Clear any previous dismissal for this category's budget alert so new threshold re-evaluates freshly
      dismissedAlertIds: prev.dismissedAlertIds.filter(
        (id) => !id.includes(`-${category}`)
      ),
    }));
  };

  const handleMarkBillPaid = (billId: string) => {
    const evaluated = evaluateBillReminders(state.billReminders, referenceDateStr);
    const match = evaluated.find((e) => e.bill.id === billId);
    const paidCycleMonth = match ? match.effectiveDueDate.slice(0, 7) : referenceMonthKey;

    setState((prev) => ({
      ...prev,
      billReminders: prev.billReminders.map((b) =>
        b.id === billId ? { ...b, paidForMonth: paidCycleMonth } : b
      ),
    }));
  };

  const handleUpdateNetWorthAlert = (next: Partial<NetWorthAlertConfig>) => {
    setState((prev) => ({
      ...prev,
      netWorthAlert: { ...prev.netWorthAlert, ...next },
      dismissedAlertIds: prev.dismissedAlertIds.filter(
        (id) => !id.startsWith('nw-drop-')
      ),
    }));
  };

  const handleDismissAlert = (alertId: string) => {
    setState((prev) => ({
      ...prev,
      dismissedAlertIds: prev.dismissedAlertIds.includes(alertId)
        ? prev.dismissedAlertIds
        : [...prev.dismissedAlertIds, alertId],
    }));
  };

  const handleRestoreDismissed = () => {
    setState((prev) => ({ ...prev, dismissedAlertIds: [] }));
  };

  const handleClearAllData = () => {
    setState((prev) => ({
      ...prev,
      incomes: [],
      expenses: [],
      assets: [],
      liabilities: [],
      investments: [],
      goals: [],
      categoryBudgets: {},
      billReminders: [],
      dismissedAlertIds: [],
      netWorthAlert: {
        ...prev.netWorthAlert,
        baselineNetWorthIQD: 0,
      },
    }));
  };

  return (
    <div
      className="min-h-screen flex bg-[#F4F6FA] dark:bg-[#060C18] text-[#0B1526] dark:text-slate-100 transition-colors duration-150"
      dir="rtl"
    >
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        settings={state.settings}
        onUpdateSettings={updateSettings}
        alertCount={activeAlerts.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Context Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0A1323]/90 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1B2B46] px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح القائمة الجانبية"
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#0B1526] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#172642] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-[17px] font-bold text-[#0B1526] dark:text-slate-100 truncate leading-tight">
                {activeNav.label}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {sectionSubtitles[activeSection]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xl:flex items-center gap-2 px-3 h-9 rounded-lg bg-[#F8FAFC] dark:bg-[#111E35] border border-[#E2E8F0] dark:border-[#1E2E4A] text-xs text-slate-500 dark:text-slate-400">
              <span>عملة العرض:</span>
              <span className="font-semibold text-[#0B1526] dark:text-slate-100">
                {CURRENCY_LABELS[state.settings.displayCurrency]}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400">حفظ محلي تلقائي</span>
            </div>

            <button
              type="button"
              onClick={() =>
                updateSettings({
                  displayCurrency:
                    state.settings.displayCurrency === 'IQD' ? 'USD' : 'IQD',
                })
              }
              aria-label="تبديل العملة السريع"
              className="sm:hidden inline-flex items-center justify-center h-9 px-2.5 rounded-lg border border-[#DCE1EC] dark:border-[#243656] bg-[#F8FAFC] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              {state.settings.displayCurrency === 'IQD' ? 'د.ع' : '$'}
            </button>

            <PWAInstallButton variant="header" />

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              aria-pressed={isDark}
              data-testid="theme-toggle-button"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg border border-[#E2E8F0] dark:border-[#243656] bg-[#F8FAFC] dark:bg-[#132038] hover:bg-slate-100 dark:hover:bg-[#1A2B4A] text-[#0B1526] dark:text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#DDBB6A]" />
              ) : (
                <Moon className="w-4 h-4 text-[#0B1526]" />
              )}
              <span className="hidden sm:inline">
                {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setNotificationDrawerOpen(true)}
              aria-label={`مركز التنبيهات الذكية (${activeAlerts.length} تنبيهات نشطة)`}
              data-testid="notification-bell-button"
              className="relative inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg border border-[#E2E8F0] dark:border-[#243656] bg-[#F8FAFC] dark:bg-[#132038] hover:bg-slate-100 dark:hover:bg-[#1A2B4A] text-[#0B1526] dark:text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Bell className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
              <span className="hidden md:inline">التنبيهات</span>
              {activeAlerts.length > 0 && (
                <span
                  data-testid="notification-badge-count"
                  className="font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-[#0B1526] dark:bg-[#C8A24A] text-[#DDBB6A] dark:text-[#0B1526] text-[11px] font-bold leading-none"
                >
                  {activeAlerts.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1380px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              state={state}
              alerts={activeAlerts}
              isDark={isDark}
              onNavigate={setActiveSection}
              onOpenNotifications={() => setNotificationDrawerOpen(true)}
              onQuickAddIncome={() =>
                handleTriggerAction({ section: 'income', mode: 'create' })
              }
              onQuickAddExpense={() =>
                handleTriggerAction({ section: 'expenses', mode: 'create' })
              }
              onTriggerAction={handleTriggerAction}
              onDeleteTransaction={(type, id) => handleDeleteRecord(type, id)}
            />
          )}

          {activeSection === 'income' && (
            <IncomeView
              incomes={state.incomes}
              settings={state.settings}
              pendingAction={pendingAction}
              onActionHandled={() => setPendingAction(null)}
              onAdd={(record) =>
                setState((prev) => ({ ...prev, incomes: [record, ...prev.incomes] }))
              }
              onUpdate={(record) =>
                setState((prev) => ({
                  ...prev,
                  incomes: prev.incomes.map((i) => (i.id === record.id ? record : i)),
                }))
              }
              onDelete={(id) => handleDeleteRecord('income', id)}
            />
          )}

          {activeSection === 'expenses' && (
            <ExpensesView
              state={state}
              expenses={state.expenses}
              settings={state.settings}
              referenceMonthKey={referenceMonthKey}
              isDark={isDark}
              pendingAction={pendingAction}
              onActionHandled={() => setPendingAction(null)}
              onAdd={(record) =>
                setState((prev) => ({ ...prev, expenses: [record, ...prev.expenses] }))
              }
              onUpdate={(record) =>
                setState((prev) => ({
                  ...prev,
                  expenses: prev.expenses.map((e) => (e.id === record.id ? record : e)),
                }))
              }
              onDelete={(id) => handleDeleteRecord('expense', id)}
              onSaveCategoryBudget={handleSaveCategoryBudget}
            />
          )}

          {activeSection === 'assets' && (
            <AssetsLiabilitiesView
              state={state}
              pendingAction={pendingAction}
              onActionHandled={() => setPendingAction(null)}
              onAddAsset={(record) =>
                setState((prev) => ({ ...prev, assets: [record, ...prev.assets] }))
              }
              onUpdateAsset={(record) =>
                setState((prev) => ({
                  ...prev,
                  assets: prev.assets.map((a) => (a.id === record.id ? record : a)),
                }))
              }
              onDeleteAsset={(id) => handleDeleteRecord('asset', id)}
              onAddLiability={(record) =>
                setState((prev) => ({
                  ...prev,
                  liabilities: [record, ...prev.liabilities],
                }))
              }
              onUpdateLiability={(record) =>
                setState((prev) => ({
                  ...prev,
                  liabilities: prev.liabilities.map((l) =>
                    l.id === record.id ? record : l
                  ),
                }))
              }
              onDeleteLiability={(id) => handleDeleteRecord('liability', id)}
            />
          )}

          {activeSection === 'investments' && (
            <InvestmentsView
              state={state}
              isDark={isDark}
              pendingAction={pendingAction}
              onActionHandled={() => setPendingAction(null)}
              onAdd={(record) =>
                setState((prev) => ({
                  ...prev,
                  investments: [record, ...prev.investments],
                }))
              }
              onUpdate={(record) =>
                setState((prev) => ({
                  ...prev,
                  investments: prev.investments.map((inv) =>
                    inv.id === record.id ? record : inv
                  ),
                }))
              }
              onDelete={(id) => handleDeleteRecord('investment', id)}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsView
              state={state}
              isDark={isDark}
              onClearAllData={handleClearAllData}
              onEditRecord={handleTriggerAction}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {activeSection === 'goals' && (
            <GoalsView
              goals={state.goals}
              settings={state.settings}
              isDark={isDark}
              onAdd={(goal) =>
                setState((prev) => ({ ...prev, goals: [goal, ...prev.goals] }))
              }
              onUpdate={(goal) =>
                setState((prev) => ({
                  ...prev,
                  goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
                }))
              }
              onDelete={(id) =>
                setState((prev) => ({
                  ...prev,
                  goals: prev.goals.filter((g) => g.id !== id),
                }))
              }
            />
          )}

          {activeSection === 'alerts' && (
            <AlertsView
              state={state}
              alerts={activeAlerts}
              referenceDateStr={referenceDateStr}
              onAddBill={(bill) =>
                setState((prev) => ({
                  ...prev,
                  billReminders: [bill, ...prev.billReminders],
                }))
              }
              onUpdateBill={(bill) =>
                setState((prev) => ({
                  ...prev,
                  billReminders: prev.billReminders.map((b) =>
                    b.id === bill.id ? bill : b
                  ),
                }))
              }
              onDeleteBill={(id) =>
                setState((prev) => ({
                  ...prev,
                  billReminders: prev.billReminders.filter((b) => b.id !== id),
                }))
              }
              onMarkBillPaid={handleMarkBillPaid}
              onUpdateNetWorthAlert={handleUpdateNetWorthAlert}
              onDismissAlert={handleDismissAlert}
              onRestoreDismissed={handleRestoreDismissed}
              onNavigate={setActiveSection}
            />
          )}
        </main>
      </div>

      <NotificationDrawer
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        alerts={activeAlerts}
        dismissedCount={state.dismissedAlertIds.length}
        onDismissAlert={handleDismissAlert}
        onRestoreDismissed={handleRestoreDismissed}
        onMarkBillPaid={handleMarkBillPaid}
        onNavigate={setActiveSection}
      />

      <QRAppLaunchModal />
      <UpdatePromptBanner />
      <OfflineIndicator />
    </div>
  );
}

export default App;
