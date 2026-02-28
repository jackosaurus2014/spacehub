# Wave 75: Developer — Feature Wiring, Bug Fixes, Accessibility

**Date:** 2026-02-28
**Role:** Developer (Senior Engineer)
**Branch:** `claude/peaceful-ardinghelli`
**Focus:** Wire up unused components, fix broken links, accessibility improvements

---

## Developer Audit Findings

Post-Wave 74 audit revealed:
- 2 components created but never imported (TrialCountdownBanner, ROICalculator)
- 1 broken internal link (/pricing-benchmarks doesn't exist)
- 1 missing loading.tsx skeleton (/enterprise)
- Multiple accessibility gaps across new components

---

## Tasks

### Task 1: Wire TrialCountdownBanner into Layout
- Dynamic import in layout.tsx (SSR: false)
- Renders before page content for trial users
- Shows urgency-appropriate banner (info/warning/urgent/critical)

### Task 2: Wire ROICalculator into Enterprise Page
- Dynamic import with loading skeleton placeholder
- Added "Calculate Your Return on Investment" section before FAQ
- ScrollReveal wrapper for animation consistency

### Task 3: Fix Broken /pricing-benchmarks Link
- Changed href from /pricing-benchmarks to /pricing in use-cases page
- Updated module name: "Pricing Benchmarks" → "Pricing & Plans"
- Updated description to match actual page content

### Task 4: Add /enterprise Loading Skeleton
- Created loading.tsx using SkeletonPage component

### Task 5: ROICalculator Accessibility
- Added aria-label to all 3 SliderField inputs
- Added explicit aria-valuemin/max/now to range inputs
- Added aria-live="polite" to results container

### Task 6: Enterprise Page SVG Accessibility
- Added aria-hidden="true" to 18 decorative SVGs

### Task 7: Satellite Tracker Canvas Accessibility
- Added role="img" to canvas element
- Added descriptive aria-label
- Added tabIndex={0} for keyboard focusability

---

## Files Modified
- `src/app/layout.tsx` — TrialCountdownBanner dynamic import
- `src/app/enterprise/page.tsx` — ROICalculator integration + SVG ARIA
- `src/app/use-cases/page.tsx` — Fixed broken /pricing-benchmarks link
- `src/components/billing/ROICalculator.tsx` — Accessibility attributes
- `src/app/satellite-tracker/page.tsx` — Canvas ARIA attributes

## Files Created
- `src/app/enterprise/loading.tsx` — Skeleton loader
