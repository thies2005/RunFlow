# PHASE 04 — Tailwind CSS: v3 → v4 (CSS-First Config, Utility Renames)

## Goal

Upgrade Tailwind CSS from v3.4.1 to v4.x. This is a major architectural shift: configuration moves from JavaScript to CSS, the PostCSS plugin changes package, several utilities are renamed, and the default border color changes. The official upgrade tool automates most of the migration.

## Documentation References

| Source | URL |
|---|---|
| Tailwind CSS v4 Upgrade Guide | https://tailwindcss.com/docs/upgrade-guide |
| Tailwind CSS v4 CSS-First Config | https://tailwindcss.com/docs/theme |
| Tailwind CSS v4 @utility Directive | https://tailwindcss.com/docs/adding-custom-styles |
| Tailwind CSS v4 @import Syntax | https://tailwindcss.com/docs/functions-and-directives |

## In Scope

- Upgrade `tailwindcss` from `^3.4.1` to `^4.x`
- Replace `autoprefixer` with built-in Tailwind v4 prefixing
- Add `@tailwindcss/postcss` package for PostCSS integration
- Replace `@tailwind base/components/utilities` with `@import "tailwindcss"` in globals.css
- Convert `tailwind.config.js` theme to CSS `@theme` directive
- Convert custom plugin (`no-scrollbar`) to `@utility` directive
- Update `postcss.config.mjs` to use `@tailwindcss/postcss`
- Handle renamed utilities (26+57+4+119+18 occurrences across src/)
- Handle default border color change (gray-200 → currentColor)
- Handle `space-y-*` / `space-x-*` selector behavior change (191 occurrences)
- Remove or archive `tailwind.config.js`
- Run the official Tailwind v4 upgrade tool

## Out of Scope

- No Next.js, React, or next-auth changes (Phase 03)
- No Prisma changes (Phase 02)
- No Capacitor changes (Phase 05)
- No application logic changes
- No security middleware changes

## Preconditions

- Phases 01–03 completed and merged
- Current build passes: `cd Web && npm run build`
- Browser support has been explicitly confirmed to allow Tailwind CSS 4's modern browser floor (Safari 16.4+, Chrome 111+, Firefox 128+). If older browsers must still be supported, do not start this phase.
- Git on clean branch: `git checkout -b migration/phase-04-tailwind`

## Files Allowed To Change

| File | Change Type |
|---|---|
| `Web/package.json` | Update tailwindcss, add @tailwindcss/postcss, remove autoprefixer |
| `Web/postcss.config.mjs` | Update plugin configuration |
| `Web/tailwind.config.js` | Remove or keep as `@config` reference |
| `Web/src/app/globals.css` | Replace @tailwind directives, add @theme, add @utility |
| All `.tsx`/`.ts` files using renamed utilities | Automated by upgrade tool |
| `Web/src/components/**/*.tsx` | Utility class renames |

## Files Forbidden To Change

- `Web/src/middleware.ts` — No security changes
- `Web/src/lib/**` — No business logic changes (only CSS class references in types are fine)
- `Web/prisma/**` — No schema changes
- `Web/Dockerfile` — No Docker changes
- `Web/next.config.mjs` — No framework config changes

## Exact Package Changes

### `Web/package.json` — devDependencies

| Package | Current | Target | Notes |
|---|---|---|---|
| `tailwindcss` | `^3.4.1` | `^4.2.0` | Major version upgrade |
| `@tailwindcss/postcss` | (new) | `^4.2.0` | PostCSS plugin (was bundled in v3) |
| `autoprefixer` | `^10.4.17` | **Remove** | Built into Tailwind v4 |

## Required Code Changes

### Step 0: Run the official Tailwind v4 upgrade tool

Per the official upgrade guide at https://tailwindcss.com/docs/upgrade-guide:

```bash
cd Web
npx @tailwindcss/upgrade
```

**This tool automates:**
- Updating dependencies in package.json
- Migrating `tailwind.config.js` theme to CSS `@theme` in your CSS file
- Renaming all deprecated/renamed utilities in template files
- Updating PostCSS config
- Replacing `@tailwind` directives with `@import "tailwindcss"`

**Important:** Run this in a clean git state so you can review the full diff. The tool requires Node.js 20+ (already on v24 from Phase 01).
Do **not** use `--force`; if the upgrade tool cannot complete safely, stop and perform the migration manually.

### Step 1: Update `Web/package.json`

After running the upgrade tool, verify the following changes were made:

```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.0",
    "tailwindcss": "^4.2.0",
    "autoprefixer": null
  }
}
```

Remove `autoprefixer` from devDependencies entirely.

### Step 2: Update `Web/postcss.config.mjs`

Per the upgrade guide — in v4, the PostCSS plugin lives in `@tailwindcss/postcss`:

```javascript
// Before
export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};

// After
export default {
    plugins: {
        "@tailwindcss/postcss": {},
    },
};
```

### Step 3: Update `Web/src/app/globals.css`

```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";
```

### Step 4: Convert theme to CSS `@theme`

The current `tailwind.config.js` has custom colors, animations, keyframes, and backdropBlur. After the upgrade tool runs, these should be converted to CSS. If the tool doesn't fully convert them, manually add:

```css
@import "tailwindcss";

@theme {
    /* Colors — CSS variable references */
    --color-background: var(--background);
    --color-background-secondary: var(--background-secondary);
    --color-background-tertiary: var(--background-tertiary);
    --color-foreground: var(--foreground);
    --color-foreground-muted: var(--foreground-muted);

    /* Accent colors */
    --color-accent-orange: var(--accent-orange);
    --color-accent-pink: var(--accent-pink);
    --color-accent-purple: var(--accent-purple);
    --color-accent-blue: #3a0ca3;
    --color-accent-cyan: var(--accent-cyan);

    /* Workout type colors */
    --color-workout-long-run: rgb(var(--color-workout-long-run));
    --color-workout-tempo: rgb(var(--color-workout-tempo));
    --color-workout-interval: rgb(var(--color-workout-interval));
    --color-workout-race: rgb(var(--color-workout-race));
    --color-workout-recovery: rgb(var(--color-workout-recovery));
    --color-workout-strength: rgb(var(--color-workout-strength));
    --color-workout-easy: rgb(var(--color-workout-easy));

    /* Zone colors */
    --color-zone-1: #4ade80;
    --color-zone-2: #a3e635;
    --color-zone-3: #facc15;
    --color-zone-4: #fb923c;
    --color-zone-5: #ef4444;

    /* Surface colors */
    --color-surface: var(--glass-bg);
    --color-surface-hover: var(--glass-bg-hover);
    --color-surface-active: var(--glass-border);

    /* Background images */
    --background-gradient-radial: radial-gradient(var(--tw-gradient-stops));
    --background-gradient-intensity: linear-gradient(135deg, #ff6b35 0%, #f72585 50%, #7209b7 100%);
    --background-gradient-recovery: linear-gradient(135deg, #4cc9f0 0%, #4ade80 100%);
    --background-gradient-card: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);

    /* Animations */
    --animate-pulse-slow: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    --animate-glow: glow 2s ease-in-out infinite alternate;
    --animate-slide-up: slideUp 0.3s ease-out;
    --animate-fade-in: fadeIn 0.4s ease-out;

    /* Custom keyframes */
    @keyframes glow {
        0% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.3); }
        100% { box-shadow: 0 0 40px rgba(247, 37, 133, 0.4); }
    }
    @keyframes slideUp {
        0% { transform: translateY(10px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
    }

    /* Custom backdrop blur */
    --backdrop-blur-xs: 2px;
}
```

**Note:** The `rgb()` with alpha-value pattern used for workout colors in v3 (`rgb(var(--color-workout-long-run) / <alpha-value>)`) is a v3-specific feature. In v4, you can define colors using `oklch()`, `rgb()`, or CSS variables directly. The upgrade tool should handle this conversion. If not, you may need to define these as individual CSS custom properties.

### Step 5: Convert custom plugin to `@utility`

The current `tailwind.config.js` has a custom plugin for `.no-scrollbar`:

```css
/* Add to globals.css after @theme */
@utility no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

@utility no-scrollbar::-webkit-scrollbar {
    display: none;
}
```

**Wait** — per the v4 docs, the `@utility` directive is for simple utility classes. The webkit pseudo-element variant may not work inside `@utility`. If it doesn't, use a standard CSS class approach:

```css
@layer base {
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
}
```

### Step 6: Handle default border color change

Per the upgrade guide — v4 changes default border color from `gray-200` to `currentColor`.

**Impact assessment:** Search for `border` utility classes that don't specify a color:

```bash
grep -rn 'border[^-]' src/ --include="*.tsx" | grep -v 'border-' | grep -v 'border$'
```

If any border utilities rely on the default gray-200 color, either:
1. Add explicit color: `border border-gray-200`
2. Or add a base style to preserve v3 behavior:

```css
@layer base {
    *,
    ::after,
    ::before,
    ::backdrop,
    ::file-selector-button {
        border-color: var(--color-gray-200, currentColor);
    }
}
```

### Step 7: Handle renamed utilities

The upgrade tool should handle these automatically. After running it, verify:

| v3 Utility | v4 Utility | Approximate Count |
|---|---|---|
| `shadow-sm` | `shadow-xs` | 26 files |
| `rounded-sm` | `rounded-xs` | 4 files |
| `rounded` | `rounded-sm` | 119 files |
| `outline-none` | `outline-hidden` | 57 files |
| `blur-sm` | `blur-xs` | 18 files |
| `ring` (bare) | `ring-3` | ~58 occurrences (some false positives) |

**The bare `ring` → `ring-3` rename requires careful review** since `ring` appears in many non-CSS contexts (e.g., `string`, `during`). Only actual Tailwind class `ring` (not `ring-*`) needs changing.

### Step 8: Handle `space-y-*` / `space-x-*` selector change

v4 changes the selector for `space-y-*` and `space-x-*` from `> :not([hidden]) ~ :not([hidden])` to `> :not(:last-child)`. This changes margin direction (from `margin-top` to `margin-bottom` for `space-y`).

191 occurrences of `space-y-*` and `space-x-*` exist. Most should work identically. If visual regressions appear, replace with flex/grid + `gap`.

### Step 9: Remove `tailwind.config.js`

After all theme values are migrated to CSS `@theme` and the upgrade tool has run:

```bash
rm Web/tailwind.config.js
```

If you need to keep it for backward compatibility, add `@config "../../tailwind.config.js"` in globals.css. However, the goal is full CSS-first config, so prefer removing it.

### Step 10: Handle `darkMode: 'class'`

The current config uses `darkMode: 'class'`. In Tailwind v4, dark mode uses the `prefers-color` media query by default. To preserve the `class`-based dark mode strategy:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));
```

This must be added to globals.css before the `@theme` block.

## Validation Commands

```bash
cd Web

# Install deps
npm ci

# Verify Tailwind/PostCSS packages are installed at v4
npm ls tailwindcss @tailwindcss/postcss

# Build
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm run test

# Verify no @tailwind directives remain
grep -rn "@tailwind" src/app/globals.css
# Expected: no output

# Verify no old tailwind.config.js (if removed)
ls tailwind.config.js
# Expected: file not found

# Verify postcss uses @tailwindcss/postcss
grep "@tailwindcss/postcss" postcss.config.mjs
# Expected: match found

# Verify no autoprefixer in deps
grep "autoprefixer" package.json
# Expected: no output

# Visual regression check — run dev server
npm run dev
# Manually verify key pages in browser
```

## Expected Failures And How To Fix Them

### 1. `@tailwindcss/upgrade` tool fails

**Symptom:** Tool exits with error or doesn't complete.

**Fix:** The tool requires Node.js 20+. Verify `node --version` returns v24.x. If it still fails:
1. Ensure all source file paths in `content` config are correct
2. Perform the migration manually following the steps above

### 2. CSS custom properties for workout colors don't work with alpha

**Symptom:** Workout color classes like `bg-workout-long-run/50` don't apply transparency.

**Fix:** Tailwind v4 handles color opacity differently. Instead of the v3 `rgb(var(...) / <alpha-value>)` pattern, define colors as oklch or use the `color-mix()` function. Alternatively, keep using explicit opacity values in the class names.

### 3. `space-y-*` layout breaks after migration

**Symptom:** Vertical spacing between elements changes direction or appears doubled.

**Fix:** The selector change means margin is now applied to `:not(:last-child)` instead of `~ :not([hidden])`. For affected components:
```html
<!-- Before -->
<div class="space-y-4">...</div>

<!-- After (if broken) -->
<div class="flex flex-col gap-4">...</div>
```

### 4. Dark mode stops working

**Symptom:** Dark mode toggle no longer applies dark styles.

**Fix:** Ensure the `@custom-variant dark` directive is in globals.css and the `.dark` class is still being applied to the `<html>` or `<body>` element by `next-themes`.

### 5. `no-scrollbar` utility not working

**Symptom:** Scrollbars reappear on elements that had `no-scrollbar`.

**Fix:** The `@utility` directive may not support pseudo-element selectors. Move to a regular CSS class definition in `@layer base` instead (see Step 5).

### 6. `@theme` keyframe definitions not recognized

**Symptom:** Custom animations (`glow`, `slideUp`, `fadeIn`) don't work.

**Fix:** In v4, keyframes may need to be defined outside `@theme`:

```css
@keyframes glow {
    0% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.3); }
    100% { box-shadow: 0 0 40px rgba(247, 37, 133, 0.4); }
}

@theme {
    --animate-glow: glow 2s ease-in-out infinite alternate;
}
```

### 7. `bg-gradient-radial` not working

**Symptom:** Radial gradient backgrounds don't render.

**Fix:** In v4, `backgroundImage` theme values are referenced differently. Verify the CSS variable naming and usage. The `bg-gradient-*` classes may need to be defined as `@utility`:

```css
@utility bg-gradient-radial {
    background-image: radial-gradient(var(--tw-gradient-stops));
}
```

## Rollback Plan

1. `git revert` the phase-04 commit on main.
2. This restores Tailwind v3 config, `@tailwind` directives, and old utility names.
3. No database or application logic was changed — visual-only phase.
4. `npm ci` will reinstall v3 packages from the reverted package.json.
5. Docker images rebuild from previous state on next deploy.

## Approval Gate

Before merging, verify:

- [ ] Tailwind v4 installed (`npm ls tailwindcss @tailwindcss/postcss` confirms v4 packages)
- [ ] Browser support is confirmed to allow Tailwind CSS 4's modern browser floor
- [ ] `autoprefixer` removed from package.json
- [ ] `@tailwindcss/postcss` in devDependencies
- [ ] `globals.css` uses `@import "tailwindcss"` (no `@tailwind` directives)
- [ ] `tailwind.config.js` removed (or kept with documented reason)
- [ ] `postcss.config.mjs` uses `@tailwindcss/postcss`
- [ ] Custom theme values migrated to `@theme` in CSS
- [ ] `no-scrollbar` utility works
- [ ] Dark mode (`class` strategy) works via `@custom-variant`
- [ ] No `outline-none` in codebase (replaced with `outline-hidden`)
- [ ] Border color defaults verified (no visual regressions)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Visual QA on key pages (dashboard, activity detail, settings)
- [ ] Mobile responsive layout verified

## Commit Message

```
migration(phase-04): upgrade Tailwind CSS 3→4, CSS-first config, utility renames
```
