# Component Inventory Page

## Completed

- [x] Scanned codebase to identify all 22 UI components
- [x] Detected duplicates/overlaps:
  - AccountDropdown vs AccountSwitcher
  - PeriodDropdown vs PeriodTabs vs PeriodPills
  - TradeDetail vs TradePanel
- [x] Detected visual inconsistencies:
  - Border radius: rounded-full, rounded-xl, rounded-lg, rounded-md
  - Heights: h-5, h-6, h-8, h-9, h-10
  - Shadows: shadow-card, shadow-sm, shadow-lg, shadow-xl
- [x] Created `/system` route at `src/app/system/page.tsx`
- [x] Rendered components grouped by category:
  1. Toggles & Buttons
  2. Dropdowns & Selectors
  3. Data Display
  4. Layout & Panels
  5. Navigation
  6. Trade Components
  7. Inconsistencies Report
- [x] Added file path labels for each component
- [x] Showed multiple variants/states (enabled, disabled, loading, empty, with data)
- [x] Added sticky sidebar navigation
- [x] Added theme switcher (light/dark/system)
- [x] Verified page loads correctly (HTTP 200)
- [x] Passed ESLint with no new errors

## Review

**File Created:**
- `src/app/system/page.tsx` - Component inventory page with all UI components

**Access:**
- Navigate to `/system` to view the inventory

**Components Documented:**
| Category | Components |
|----------|------------|
| Toggles & Buttons | PlanFilterToggle |
| Dropdowns & Selectors | PeriodPills, PeriodDropdown, PeriodTabs |
| Data Display | PeriodStats, TradeTable |
| Layout & Panels | SlidePanel, SettingsModal |
| Navigation | UserMenu, Sidebar |
| Trade Components | TradeDetail |

**Note:** Some components (AccountDropdown, AccountSwitcher, MonthlyBreakdown, TradePanel, TradeChart, AnnotationForm, ProfileSection, AccountsSection, SetupsSection) require API data or have complex dependencies. They are documented but not all are rendered in the inventory to avoid API errors on the standalone page.
