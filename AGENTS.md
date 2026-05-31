# AI Side Worker Guide for Dues Management System

This file defines how AI coding agents, contributors, and future assistants should work on this repository. Treat it as the project's side-worker rulebook.

## Project context

This is a student dues management system with:

- Next.js frontend
- Express/Node backend
- MySQL database
- Paystack payments
- Manual payment approval
- SMS notifications through GOnlineSites
- Receipts, reports, audit logs, students, admins, and settings

Because the app handles student records, payments, receipts, login resets, SMS, and admin actions, changes must be careful, traceable, and backwards-compatible.

## Non-negotiable rules

1. Do not hardcode institution names.
   - Do not add hardcoded UCC, HTU, UEW, school emails, or school-specific text in frontend pages.
   - Use settings-driven branding from `app_name`, logos, public settings, and admin configuration.
   - Sample data must be generic unless the admin provides exact production values.

2. Do not use emoji characters in the UI.
   - Use SVG icons from `frontend/src/components/Icons.tsx`.
   - If a needed icon does not exist, add a reusable SVG icon component there.

3. Never break payment flow.
   - Do not change payment status names without checking every controller, dashboard, reports page, receipts page, and Paystack verification code.
   - Valid current payment statuses include `pending`, `approved`, `rejected`, and `completed`.

4. Never expose sensitive secrets.
   - Do not commit API keys, Paystack secrets, SMS API keys, SMTP passwords, JWT secrets, database URLs, or admin passwords.
   - Use Railway/Vercel environment variables or encrypted settings.

5. Be careful with database migrations.
   - Any schema change must be backwards-compatible.
   - Prefer `CREATE TABLE IF NOT EXISTS` and duplicate-safe `ALTER TABLE` handling.
   - Existing Railway MySQL databases may already contain old tables.
   - Do not drop or rename production tables without a backup/migration path.

6. Keep minors and privacy rules intact.
   - Registration must keep consent to Privacy Policy and Terms & Conditions.
   - Users under 13 must not register unless authorized by parent, guardian, school, department, or administrator.
   - Do not remove privacy/terms links from public pages.

## Recommended development workflow

Before changing code:

1. Identify the exact feature or bug.
2. Inspect the existing route/controller/page first.
3. Check whether a backend route already exists before adding a new one.
4. Check database fields used by controllers against `backend/src/config/schema.sql`.
5. Make the smallest safe patch.
6. Mention the files changed and how to test.

## Frontend rules

- Use the existing `api` client from `frontend/src/lib/api.ts`.
- Use `react-hot-toast` for feedback.
- Protect admin pages from student users.
- Keep UI consistent with the current card/button/input classes.
- Do not redesign pages unless explicitly requested.
- Replace emojis with SVG icons.
- Avoid hardcoded fallback institution names.
- Use `useBranding()` for app name/logo where possible.

## Backend rules

- Use existing middleware from `backend/src/middleware/auth.js`.
- Use `auditLog` middleware or manual audit inserts for sensitive admin actions.
- Use `bcryptjs` for passwords.
- Use `generateUUID()` for IDs.
- Use `sendSMS()` from `backend/src/services/notificationService.js` for SMS.
- Never return passwords in production responses.
- Validate inputs before writing to the database.

## Sensitive actions that need audit logs

Add or preserve audit logs for:

- Creating, updating, deleting, activating, or deactivating students
- Bulk student imports
- Manual payment approval/rejection
- Payment edits or reconciliation
- Receipt generation/regeneration
- Student credential resets
- Admin password or role changes
- Settings changes
- Bulk SMS sends

## SMS rules

The current SMS provider is GOnlineSites.

Expected environment variables:

```env
SMS_PROVIDER=gonlinesites
SMS_API_URL=http://sms.gonlinesites.com/app/sms/api
SMS_API_KEY=your_api_key
SMS_SENDER_ID=UEW Dues
```

SMS messages should be short and avoid unnecessary Unicode unless needed, because Unicode messages reduce characters per SMS page.

SMS should be used for:

- Payment confirmation
- Receipt confirmation
- Student credential reset
- Password reset OTP
- Bulk reminders

Future work should add durable SMS delivery logs with provider responses.

## Payment and receipt rules

- Receipts should only be generated for verified, approved, or completed payments.
- Manual payments must stay pending until an authorized admin approves them.
- Payment proof files must not be trusted without admin review.
- Paystack transaction verification should remain server-side.
- Receipt verification should eventually have a public verification page.

## Settings-driven branding

The app should load these from settings:

- `app_name`
- `app_logo`
- `app_logo_secondary`
- `app_favicon`
- available programmes
- academic years
- registration status
- payment/manual payment settings
- SMS/email templates

Do not add hardcoded institution branding to:

- landing page
- login page
- registration page
- emails
- SMS templates
- PDF receipts
- CSV templates
- metadata

## Suggested next feature roadmap, excluding multi-department support

Basic:

- Admin profile page
- SMS delivery logs
- Receipt verification page
- Better due reminder SMS
- Export paid/unpaid students

Intermediate:

- Due categories
- Overdue rules and reminder schedules
- Student account lock/unlock
- Admin activity risk alerts
- Better report filters

Advanced:

- Role-based permissions
- Admin 2FA
- Payment reconciliation dashboard
- Export center for CSV/PDF/Excel
- Bulk actions for selected students

## Testing checklist after any change

Frontend:

- `npm run build`
- Visit public homepage
- Visit login/register pages
- Visit admin dashboard
- Visit student dashboard
- Confirm no UCC/HTU/UEW hardcoded text unless set by admin settings
- Confirm no emoji glyphs appear in changed UI

Backend:

- `npm start` or Railway deploy logs
- `/health`
- `/api`
- Login as admin
- Login as student
- Create due
- Assign due
- Submit payment
- Approve manual payment
- Generate receipt
- Send/reset SMS if provider variables exist

Database:

- Confirm migrations do not crash existing Railway MySQL
- Confirm `dues`, `due_assignments`, `payments`, `receipts`, `settings`, `audit_logs`, and `students` still work

## Response format for future AI agents

When reporting a change, include:

- Files changed
- What changed
- Commit SHA if available
- How to test
- Any risk or follow-up needed
