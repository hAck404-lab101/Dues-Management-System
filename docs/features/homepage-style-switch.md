# Homepage Style Switch

## Purpose

The homepage style switch lets administrators choose which public homepage students see.

There are two homepage variants:

- `portal`: the current dashboard-style homepage, focused on student account actions and receipt verification.
- `classic`: the earlier homepage layout with hero, features, and how-it-works sections.

This avoids hardcoding one homepage design and lets admins switch the public-facing experience without a code change.

## Admin Location

Admin path:

```text
Admin Dashboard → Settings → Maintenance → Homepage Style
```

The admin can select:

```text
CURRENT PORTAL HOMEPAGE
CLASSIC HOMEPAGE
```

The setting is saved through the existing settings API.

## Setting Key

```text
homepage_variant
```

Allowed values:

```text
portal
classic
```

Default value:

```text
portal
```

## Files Changed

```text
backend/src/controllers/settingsController.js
backend/migrate-settings-v2.js
frontend/src/contexts/BrandingContext.tsx
frontend/src/app/admin/settings/page.tsx
frontend/src/app/page.tsx
```

Related auth navigation improvements:

```text
frontend/src/app/login/page.tsx
frontend/src/app/register/page.tsx
frontend/src/app/forgot-password/page.tsx
frontend/src/app/reset-password/page.tsx
```

## Backend Notes

`settingsController.js` ensures the default `homepage_variant` setting exists. It also exposes `homepage_variant` through `/settings/public` so the public homepage can read it.

`migrate-settings-v2.js` includes the setting for fresh installs.

## Frontend Notes

`BrandingContext.tsx` now exposes:

```ts
homepageVariant: 'portal' | 'classic'
```

`frontend/src/app/page.tsx` renders:

```tsx
homepageVariant === 'classic' ? <ClassicHomepage /> : <PortalHomepage />
```

## UI Notes

The portal homepage was adjusted to reduce mobile squeezing:

- Mobile removes the outer container padding around the main hero.
- Cards use full-width mobile layout.
- The current homepage avoids gradient styling and avoids outline/bordered call-to-action buttons.
- Brand colors are kept through solid primary and secondary sections.

## Testing Notes

Manual checks:

1. Open Admin Settings.
2. Go to Maintenance.
3. Change Homepage Style to Classic.
4. Save Maintenance Settings.
5. Open the public homepage and confirm the classic layout appears.
6. Change Homepage Style back to Current Portal Homepage.
7. Save again and confirm the portal layout appears.
8. Check mobile homepage spacing.
9. Check Login, Register, Forgot Password, and Reset Password pages for clear Home/Login/Register navigation.

## Security Notes

The setting is public-safe because it controls only which homepage UI variant is displayed. It does not expose secrets, payment keys, student records, or admin-only data.

## Known Issues

No automated test was added for this feature yet. A future test could mock `/settings/public` and verify that the correct homepage component renders for `portal` and `classic` values.
