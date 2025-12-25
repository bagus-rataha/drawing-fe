# React Lottery App - Styling Implementation

## Overview

Implementasi design system dengan style **clean, professional, tidak sepi** - terinspirasi Stripe.

**Aturan utama:**
- NO gradient backgrounds
- NO excessive decorations  
- Clean shadows & borders
- Good typography hierarchy
- Subtle hover effects

---

## WAJIB: Plan Before Execute

Sebelum mengerjakan setiap task:
1. **Buat plan** - files yang akan dimodifikasi
2. **Tunggu approval** dari user
3. **Setelah approved**, baru eksekusi

---

## Phase 1: Foundation

### 1.1 Install Dependencies

```bash
npm install @fontsource/plus-jakarta-sans framer-motion react-countup
```

### 1.2 Setup Font

```typescript
// main.tsx
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
```

### 1.3 Color Palette

```json
{
  "primary": "#635bff",
  "primaryDark": "#4f46e5",
  
  "navy": "#0a2540",
  
  "success": "#059669",
  "warning": "#d97706",
  "error": "#dc2626",
  
  "background": "#f6f9fc",
  "surface": "#ffffff",
  
  "border": "#e6ebf1",
  
  "text": {
    "primary": "#0a2540",
    "secondary": "#425466",
    "muted": "#6b7c93"
  }
}
```

### 1.4 Tailwind Config

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#635bff',
          dark: '#4f46e5',
        },
        navy: '#0a2540',
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f6f9fc',
        },
        border: '#e6ebf1',
        content: {
          DEFAULT: '#0a2540',
          secondary: '#425466',
          muted: '#6b7c93',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(10,37,64,0.08)',
        'card-hover': '0 4px 16px rgba(10,37,64,0.12)',
      },
    },
  },
}
```

---

## Phase 2: Page Layouts

### 2.1 Home Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (sticky)                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     [+ Create Event]                            │
│                        (centered)                               │
│                                                                 │
│         ┌───────────────────────────────────────┐               │
│         │          Event Card 1                 │               │
│         └───────────────────────────────────────┘               │
│                                                                 │
│         ┌───────────────────────────────────────┐               │
│         │          Event Card 2                 │               │
│         └───────────────────────────────────────┘               │
│                                                                 │
│         ┌───────────────────────────────────────┐               │
│         │          Event Card 3                 │               │
│         └───────────────────────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

- Background: #f6f9fc
- Event list: centered, max-width 720px
- Card gap: 16px
```

### 2.2 Wizard Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              ①───────②───────③───────④───────⑤                  │
│             Info   Prizes  Import  Display  Review              │
│                                                                 │
│         ┌───────────────────────────────────────┐               │
│         │                                       │               │
│         │   Form fields here                    │               │
│         │   (single column)                     │               │
│         │                                       │               │
│         │                                       │               │
│         │             [Back]  [Next]            │               │
│         │                                       │               │
│         └───────────────────────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

- Form container: centered, max-width 640px
- Form container: white bg, rounded-xl, shadow-card, padding 32px
```

### 2.3 History Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ← Back to Events                                               │
│                                                                 │
│  Event Name - Winner History                     [Export CSV]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Prize      │ Winner         │ Coupon    │ Drawn At      │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ Grand Prize│ P001 - John    │ C00123    │ 24 Dec 10:00  │    │
│  │ 2nd Prize  │ P045 - Jane    │ C00456    │ 24 Dec 10:05  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                 [<]  Page 1 of 10  [>]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

- Content: centered, max-width 960px
- Table: white bg, rounded-lg, border
```

---

## Phase 3: Component Specs

### 3.1 Header

```
┌─────────────────────────────────────────────────────────────────┐
│  [■] LotteryApp                                [+ Create Event] │
└─────────────────────────────────────────────────────────────────┘

Container:
- height: 64px
- background: #ffffff
- border-bottom: 1px solid #e6ebf1
- position: sticky, top: 0
- padding: 0 24px
- display: flex, justify-between, align-center

Logo:
- Icon: 32x32, background #635bff, border-radius 8px
- Text: "LotteryApp", 18px, font-weight 700, color #0a2540
- Gap: 10px

Create Event Button:
- Tampilkan di header
- Style: primary button (lihat button specs)
- Size: small
```

### 3.2 Event Card

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Event tahun                                    [Draft]    ⋮   │
│  Description text here...                                      │
│                                                                │
│  🎁 0 prizes    👥 1,539 participants    🎫 146,603 coupons    │
│                                                                │
│  Win Rule: Limited Wins (max 3)                                │
│  Updated 24 Des 2025, 10.58                                    │
│                                                                │
│  [ Edit ]  [ Start Draw ]                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘

Container:
- background: #ffffff
- border: 1px solid #e6ebf1
- border-radius: 16px
- box-shadow: 0 2px 8px rgba(10,37,64,0.08)
- padding: 24px
- hover: border-color #635bff, box-shadow 0 4px 16px rgba(10,37,64,0.12)
- transition: all 200ms ease

Title Row:
- Title: 20px, font-weight 700, color #0a2540
- Badge: di kanan
- Menu icon: 20px, color #6b7c93

Description:
- 14px, font-weight 400, color #6b7c93
- margin-top: 4px
- max 2 lines, ellipsis

Stats Row:
- margin-top: 16px
- display: flex, gap 24px
- Icon: 16px, color #635bff
- Number: 16px, font-weight 600, color #0a2540
- Label: 14px, font-weight 400, color #6b7c93

Win Rule Row:
- margin-top: 16px
- Label "Win Rule:": 14px, color #6b7c93
- Value: 14px, font-weight 600, color #0a2540

Updated Row:
- margin-top: 4px
- 12px, color #6b7c93

Action Buttons:
- margin-top: 20px
- display: flex, gap 12px
- Edit: outline button
- Start Draw / Continue: primary button
```

### 3.3 Status Badge

```
Variants:
- Draft:       bg #f1f5f9, text #64748b
- Ready:       bg #ecfdf5, text #059669  
- In Progress: bg #eff6ff, text #2563eb
- Completed:   bg #f0fdf4, text #16a34a

Style:
- padding: 6px 12px
- border-radius: 50px (pill)
- font-size: 12px
- font-weight: 500
```

### 3.4 Buttons

```
Primary:
- background: #635bff
- color: #ffffff
- padding: 10px 20px
- border-radius: 8px
- font-weight: 600
- font-size: 14px
- hover: background #4f46e5, translateY(-1px)
- transition: all 200ms ease

Outline:
- background: transparent
- color: #0a2540
- border: 1px solid #e6ebf1
- padding: 10px 20px
- border-radius: 8px
- font-weight: 600
- font-size: 14px
- hover: border-color #635bff, color #635bff

Sizes:
- small: padding 8px 16px, font-size 13px
- default: padding 10px 20px, font-size 14px
- large: padding 12px 24px, font-size 16px
```

### 3.5 Form Input

```
Default:
- background: #ffffff
- border: 1px solid #e6ebf1
- border-radius: 8px
- padding: 12px 16px
- font-size: 16px
- color: #0a2540

Focus:
- border-color: #635bff
- box-shadow: 0 0 0 3px rgba(99,91,255,0.1)
- outline: none

Placeholder:
- color: #6b7c93

Label:
- font-size: 14px
- font-weight: 500
- color: #0a2540
- margin-bottom: 6px

Helper Text:
- font-size: 12px
- color: #6b7c93
- margin-top: 4px

Error State:
- border-color: #dc2626
- Error text: 12px, color #dc2626
```

### 3.6 Wizard Stepper

```
┌─────────────────────────────────────────────────────────────────┐
│              ①───────②───────③───────④───────⑤                  │
│             Info   Prizes  Import  Display  Review              │
└─────────────────────────────────────────────────────────────────┘

Step Circle (32x32):
- Completed: background #059669, icon checkmark white
- Active: background #635bff, number white
- Inactive: background #e6ebf1, number #6b7c93

Step Label:
- Completed: color #059669
- Active: color #635bff, font-weight 600
- Inactive: color #6b7c93

Connector Line:
- width: 48px
- height: 2px
- Completed: background #059669
- Incomplete: background #e6ebf1
```

### 3.7 Table

```
Container:
- background: #ffffff
- border: 1px solid #e6ebf1
- border-radius: 12px
- overflow: hidden

Header Row:
- background: #f6f9fc
- border-bottom: 1px solid #e6ebf1

Header Cell:
- padding: 16px
- font-size: 12px
- font-weight: 600
- color: #6b7c93
- text-transform: uppercase
- letter-spacing: 0.5px

Body Row:
- border-bottom: 1px solid #e6ebf1
- hover: background #f6f9fc
- transition: background 150ms ease

Body Cell:
- padding: 16px
- font-size: 14px
- color: #0a2540
```

### 3.8 Pagination

```
Container:
- display: flex, justify-center, align-center, gap 8px
- margin-top: 24px

Page Button:
- width: 36px
- height: 36px
- border: 1px solid #e6ebf1
- border-radius: 8px
- font-size: 14px
- color: #6b7c93
- hover: border-color #635bff, color #635bff

Active Page:
- background: #635bff
- color: #ffffff
- border-color: #635bff

Page Info Text:
- font-size: 14px
- color: #6b7c93
```

---

## Phase 4: Additional Components

### 4.1 Empty State

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                          [ Icon ]                               │
│                                                                 │
│                      No events yet                              │
│              Create your first lottery event                    │
│                                                                 │
│                     [+ Create Event]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

- Icon container: 64x64, background #f6f9fc, border-radius 50%
- Icon: 32px, color #6b7c93
- Title: 18px, font-weight 600, color #0a2540
- Description: 14px, color #6b7c93
- Button: primary style
```

### 4.2 Loading Skeleton

```
Style:
- background: linear-gradient(90deg, #e6ebf1 25%, #f6f9fc 50%, #e6ebf1 75%)
- background-size: 200% 100%
- animation: shimmer 1.5s infinite
- border-radius: 6px

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 4.3 Toast/Notification

```
Success:
- background: #ecfdf5
- border-left: 4px solid #059669
- color: #059669

Error:
- background: #fef2f2
- border-left: 4px solid #dc2626
- color: #dc2626

Container:
- padding: 16px
- border-radius: 8px
- box-shadow: 0 4px 12px rgba(0,0,0,0.1)
```

### 4.4 Dialog/Modal

```
Overlay:
- background: rgba(10, 37, 64, 0.5)
- backdrop-filter: blur(4px)

Content:
- background: #ffffff
- border-radius: 16px
- padding: 24px
- box-shadow: 0 20px 40px rgba(10,37,64,0.2)
- max-width: 480px

Title:
- font-size: 18px
- font-weight: 700
- color: #0a2540

Description:
- font-size: 14px
- color: #6b7c93
- margin-top: 8px

Footer:
- margin-top: 24px
- display: flex, justify-end, gap 12px
```

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add dependencies |
| `src/main.tsx` | Import fonts |
| `tailwind.config.ts` | Update theme config |
| `src/index.css` | Update global styles |
| `src/components/ui/button.tsx` | Update variants |
| `src/components/ui/badge.tsx` | Update variants |
| `src/components/ui/input.tsx` | Update styling |
| `src/components/ui/table.tsx` | Update styling |
| `src/components/ui/dialog.tsx` | Update styling |
| `src/components/ui/skeleton.tsx` | Add shimmer |
| `src/components/layout/Header.tsx` | Create/update |
| `src/components/event/EventCard.tsx` | Update styling |
| `src/components/wizard/WizardStepper.tsx` | Update styling |
| `src/components/ui/EmptyState.tsx` | Create |
| `src/pages/Home.tsx` | Apply layout |
| `src/pages/EventWizard.tsx` | Apply layout |
| `src/pages/History.tsx` | Apply layout |

---

## Execution Order

```
1. Foundation
   ├── Install dependencies
   ├── Setup fonts (main.tsx)
   ├── Update tailwind.config.ts
   └── Update index.css
       ↓
2. Base Components
   ├── Button variants
   ├── Badge variants
   ├── Input styling
   ├── Table styling
   ├── Dialog styling
   └── Skeleton shimmer
       ↓
3. Layout Components
   ├── Header
   └── EmptyState
       ↓
4. Feature Components
   ├── EventCard
   └── WizardStepper
       ↓
5. Page Layouts
   ├── Home page
   ├── Wizard page
   └── History page
       ↓
6. Review & Polish
```

---

## Testing Checklist

- [ ] Font Plus Jakarta Sans loaded
- [ ] Colors match spec
- [ ] Header sticky, correct height
- [ ] Event cards centered, correct shadow/border
- [ ] Event card hover effect works
- [ ] Status badges correct colors
- [ ] Buttons correct styles & hover effects
- [ ] Form inputs focus state correct
- [ ] Wizard stepper states correct
- [ ] Table styling correct
- [ ] Pagination styling correct
- [ ] Empty state displays correctly
- [ ] Loading skeleton animates
- [ ] Dialog/modal overlay & content correct
- [ ] Responsive pada mobile/tablet/desktop
- [ ] No regressions pada existing features
