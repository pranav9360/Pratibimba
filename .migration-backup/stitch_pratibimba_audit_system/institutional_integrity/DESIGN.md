---
name: Institutional Integrity
colors:
  surface: '#f8f9ff'
  surface-dim: '#d1dbec'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dfe9fa'
  surface-container-highest: '#d9e3f4'
  on-surface: '#121c28'
  on-surface-variant: '#5a4138'
  inverse-surface: '#27313e'
  inverse-on-surface: '#eaf1ff'
  outline: '#8e7166'
  outline-variant: '#e2bfb2'
  surface-tint: '#a73a00'
  primary: '#a33900'
  on-primary: '#ffffff'
  primary-container: '#cc4900'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb599'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#bb0112'
  on-tertiary: '#ffffff'
  tertiary-container: '#e02928'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f8f9ff'
  on-background: '#121c28'
  surface-variant: '#d9e3f4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  sidebar-width: 260px
---

## Brand & Style
The design system is engineered for high-stakes compliance and enterprise auditing. It strikes a balance between traditional institutional authority and modern administrative efficiency. The aesthetic is rooted in **Modern Minimalism** with a focus on clarity, order, and high information density that remains legible and un-intimidating.

The target audience consists of compliance officers and administrators who require a tool that feels stable, secure, and precise. The UI evokes an emotional response of "calm control" through the use of a warm, paper-like background paired with structured, professional layouts. Every element is designed to minimize cognitive load while ensuring that critical audit trails are never overlooked.

## Colors
The palette is dominated by a warm "Cream" background to reduce eye strain during long auditing sessions, departing from the clinical coldness of pure white. 

- **Primary (Saffron Orange):** Reserved for primary actions and brand identity. It symbolizes energy and alertness.
- **Secondary (Deep Blue):** Used for structural elements like the sidebar and navigation to ground the interface in professionalism.
- **Status Colors:** These follow a strict semantic mapping to ensure immediate recognition of audit states. They are applied with a "tinted background + dark text" pattern for accessibility.

## Typography
The typography system prioritizes legibility and hierarchical clarity. **Hanken Grotesk** provides a sharp, contemporary feel for headlines. **Inter** is used for all body text and UI controls due to its exceptional readability at small sizes. 

For audit logs, timestamps, and ID numbers, **JetBrains Mono** is utilized to ensure that numerical data is easily scannable and that characters (like 0 and O) are distinct. Use `display-lg` exclusively for dashboard overview totals and `label-md` for table headers and section titles.

## Layout & Spacing
The design system utilizes a **Fixed Grid** model for desktop to maintain a professional, document-like feel. 

- **Grid:** 12-column layout with 24px gutters.
- **Margins:** 32px page margins on desktop; 16px on mobile.
- **Sidebar:** Fixed at 260px, utilizing the Secondary Deep Blue color for the background.
- **Data Density:** Use the `md` (16px) spacing unit for standard padding in tables and cards to ensure a "spacious" and calm layout, preventing the data-heavy audit logs from feeling cramped.

## Elevation & Depth
Depth is achieved through **Tonal Layering** rather than heavy shadows. The background is `#FFF7ED` (Cream), and the primary surface containers (Cards, Tables) are `#FFFFFF` (White). 

To separate these layers, use a single, extremely soft shadow: `0 4px 12px rgba(30, 58, 138, 0.05)`. This slight blue-tinted shadow reinforces the institutional feel. For interactive elements like modals or dropdowns, a secondary elevation layer with a slightly larger blur (20px) and 8% opacity should be used to create a "floating" effect.

## Shapes
A "Rounded" shape language (8px / 0.5rem) is the standard for this design system. This choice softens the "rigid" nature of audit data, making the platform feel approachable while maintaining a structured grid. 

- **Buttons & Inputs:** Use the standard 8px radius.
- **Cards:** Use 12px (rounded-lg) to define large content areas.
- **Status Chips:** Use a full pill-shape (100px) to distinguish them from interactive buttons.

## Components
### Sidebar & Navigation
The sidebar uses a dark-themed application of the Secondary color. Nav items should have an active state indicated by a Saffron Orange vertical bar on the left and a subtle white opacity (10%) background shift.

### Data Tables & Status Chips
Tables must use zebra-striping with a very faint cream tint (`#FFFBF7`). Headers are `label-md` in a muted gray. Status chips use a 10% opacity background of their semantic color with 100% opacity text for the label.

### Audit Timeline
Vertical lines should be 2px wide in light gray. Active nodes use the Primary color, while historical nodes use the Secondary color. Use `data-mono` for all timestamps within the timeline.

### Form Elements & Search
Input fields should have a 1px border (`#E5E7EB`). On focus, the border shifts to Primary Saffron with a 2px soft outer glow. Search bars should include a leading icon and a "Cmd+K" keyboard shortcut hint in `data-mono`.

### Dashboard Cards
Cards should display a single primary metric in `display-lg`. If a trend is present (e.g., +12%), use the Verified Green or Rejected Red text without a background box to keep the visual clutter low.