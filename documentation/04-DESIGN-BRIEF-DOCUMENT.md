# DUMAL-NEXT: DESIGN BRIEF & UI SYSTEM SPECIFICATION (DBD)

**Theme Name**: Department of Education Institutional Navy & Gold Design System  
**Lead Entity**: Dumalneg National High School (School ID: 300017)  
**Primary Aesthetic**: Formal, Academic, Accessible, and Clean  
**Document Version**: 1.0 (Production Brand Guidelines)  

---

## 1. Brand Philosophy & Design Principles

The visual design of **Dumal-NEXT** reflects the dignity, authority, and public service ethos of the Department of Education (DepEd) Philippines and Dumalneg National High School.

### Core Principles:
1. **Academic Seriousness (Zero Decorative Emojis)**:
   * Decorative icons, cartoon smileys, and emojis are **strictly prohibited** in all UI components, buttons, and system messages.
   * Status and actions must be communicated via clear, dignified text labels (e.g., `[ APPROVED ]`, `[ PENDING EVALUATION ]`, `[ NEEDS REVISION ]`, `Submit Application`, `View Section`).
2. **Institutional DepEd Color Hierarchy**:
   * Anchored by DepEd Navy Blue (`#002060`) and Pure White (`#FFFFFF`), with Gold/Amber (`#F59E0B`) accents representing academic excellence and institutional integrity.
3. **Consistent Geometric Form (Standardized 4px Radius)**:
   * All structural boxes, form input fields, buttons, modal dialogs, cards, and tables utilize a uniform **4px border radius** (`--radius: 4px`), giving the interface a crisp, reliable, government-standard aesthetic. Circular radii (`9999px`) are reserved exclusively for status indicator pips.
4. **Universal System Typography**:
   * Cross-platform system sans-serif font stack ensuring identical legibility on Windows, Android smartphones, iOS, and macOS devices.

---

## 2. Color Palette & Token Specifications

### 2.1. Institutional Core Brand Colors

| Token Name | Hex Code | RGB | Sample Usage |
| :--- | :--- | :--- | :--- |
| `--deped-navy` | `#002060` | `rgb(0, 32, 96)` | Primary header navigation, active buttons, main titles, brand accents |
| `--deped-navy-dark`| `#001744` | `rgb(0, 23, 68)` | Header border bottoms, drawer headers, high-contrast dark sections |
| `--deped-navy-light`| `#0D3882`| `rgb(13, 56, 130)`| Gradient accents, button hover states, category headings |
| `--deped-gold` | `#F59E0B` | `rgb(245, 158, 11)`| Hero trim lines, call-to-action highlights, academic year badges |
| `--deped-gold-light`| `#FBBF24`| `rgb(251, 191, 36)`| Secondary gold accents, active tab underlines |

### 2.2. Neutral & Surface Tones

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `--deped-surface` | `#F8FAFC` | Main application background (Slate-50) |
| `--deped-white` | `#FFFFFF` | Content card surfaces, form input backgrounds, modal canvas |
| `--deped-border` | `#CBD5E1` | Default component borders, structural dividing lines (Slate-300) |
| `--deped-border-subtle` | `#E2E8F0` | Subtle inner borders, table cell dividers (Slate-200) |
| `--deped-text-main` | `#0F172A` | Primary body typography, high-contrast labels (Slate-900) |
| `--deped-text-muted` | `#475569` | Helper descriptions, subheadings, metadata timestamps (Slate-600) |

### 2.3. Semantic Status Indicators

| Status Category | Background | Border | Text Color | Dot Pip Color |
| :--- | :--- | :--- | :--- | :--- |
| **Approved / Enrolled** | `#ECFDF5` (Emerald-50) | `#10B981` (Emerald-500) | `#064E3B` (Emerald-900) | `#059669` (Emerald-600) |
| **Pending Verification**| `#FFFBEB` (Amber-50) | `#F59E0B` (Amber-500) | `#78350F` (Amber-900) | `#D97706` (Amber-600) |
| **Needs Revision / Action**| `#FEF2F2` (Red-50) | `#EF4444` (Red-500) | `#7F1D1D` (Red-900) | `#DC2626` (Red-600) |
| **Information / Active** | `#EFF6FF` (Blue-50) | `#3B82F6` (Blue-500) | `#1E3A8A` (Blue-900) | `#2563EB` (Blue-600) |

---

## 3. Typography System

The application strictly enforces a system font stack to prevent Layout Shifts (CLS) and ensure rapid rendering over low-bandwidth mobile connections:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
```

### Type Scale & Hierarchy:

| Element | Size | Weight | Line Height | Tracking | Example Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | `26px` / `1.625rem` | Bold (`700`) | `1.3` | `-0.02em` | Portal Landing Hero title |
| **Page Heading** | `20px` / `1.25rem` | Bold (`700`) | `1.35` | `-0.015em`| Section headers, Dashboard welcome |
| **Card Heading** | `16px` / `1.0rem` | Bold (`700`) | `1.4` | `-0.01em` | Step titles, module cards |
| **Body Standard** | `13px` / `0.8125rem` | Normal (`400`)| `1.5` | `normal` | Form explanations, card descriptions |
| **Form Label** | `12px` / `0.75rem` | Bold (`700`) | `1.25` | `normal` | Field inputs (`First Name *`, `LRN`) |
| **Metadata & Subtext**| `11px` / `0.6875rem`| Normal (`400`)| `1.4` | `normal` | Timestamps, helper instructions |
| **Status Badge** | `10px` / `0.625rem` | Bold (`700`) | `1.0` | `+0.05em` | `[ APPROVED ]`, `[ PENDING ]` |

---

## 4. UI Elevation & Shadow System

Shadows are subtly tinted with the primary DepEd navy tone (`rgb(0, 32, 96)`) to preserve depth without appearing harsh or dirty:

```css
/* Subtle Elevation: Form fields and inner panels */
--shadow-subtle: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Card Elevation: Standard white dashboard and content cards */
--shadow-card: 0 1px 3px 0 rgba(0, 32, 96, 0.06), 0 1px 2px -1px rgba(0, 32, 96, 0.04);

/* Raised Elevation: Sticky auth card, interactive hover states */
--shadow-raised: 0 4px 6px -1px rgba(0, 32, 96, 0.08), 0 2px 4px -2px rgba(0, 32, 96, 0.06);

/* Overlay Elevation: Modal dialogs, document viewer, slide-over drawer */
--shadow-overlay: 0 10px 15px -3px rgba(0, 16, 48, 0.15), 0 4px 6px -4px rgba(0, 16, 48, 0.10);
```

---

## 5. Component Standards

### 5.1. Buttons
* **Primary Button (`.btn-primary`)**:
  * Background: `#002060` (DepEd Navy).
  * Text: `#FFFFFF` (White), Bold, 12px.
  * Border Radius: `4px`.
  * Hover: `#001744` with subtle scale-up (`scale-[1.01]`).
  * Mobile Minimum Height: `42px` touch target.
* **Secondary / Action Button**:
  * Background: `#F59E0B` (Gold) or White with `#002060` border.
  * Text: High-contrast Slate-950 or Navy.
* **Danger Button**:
  * Background: `#DC2626` (Red-600) with `#991B1B` hover state.

### 5.2. Form Inputs & Select Controls
* **Default State**:
  * Background: `#F8FAFC` (Slate-50), Border: 2px solid `#CBD5E1` (Slate-300).
  * Padding: 10px 12px (text size: 12px).
  * Rounded: `4px`.
* **Focus State**:
  * Background: `#FFFFFF` (Pure White).
  * Border: 2px solid `#002060` (DepEd Navy), outline none.
* **Error State**:
  * Border: 2px solid `#EF4444` (Red-500) with inline 10px error message below.

### 5.3. Status Badges
* Must include:
  1. A background tinted to the status color.
  2. A solid border matching the status indicator.
  3. A 6px circular dot pip (`rounded-full`).
  4. Uppercase bold text.
* Example: `[ ● Status: Approved & Officially Enrolled ]`.

### 5.4. Responsive Breakpoints & Mobile Optimization
* **Touch Devices (< 640px)**:
  * Minimum touch target height of 42px on all interactive inputs and buttons.
  * Navigation transitions into a slide-over drawer menu anchored with the official Dumalneg NHS seal.
  * Split-screen desktop layouts fold into an intuitive top-to-bottom reading sequence.
