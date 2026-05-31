# Production Security Hardening

## Purpose
This feature hardens the Dues Management System backend before production deployment by reducing public exposure of sensitive files, strengthening authentication validation, improving rate limiting coverage, and documenting the required security checks.

## Branch
Intended branch:
`security/production-hardening`

> Note: This feature should be developed and reviewed on a separate branch before merging into `main`.

## Files Added/Changed
Planned/related files:
- `backend/server.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/payments.js`
- `backend/src/controllers/paymentsController.js`
- `backend/src/services/paystackService.js`
- `docs/features/production-security-hardening.md`

## Security Problems Addressed
- Public static access to `/uploads`, which may expose manual payment proofs.
- Weak password length requirements.
- Missing validation middleware on reset-password route.
- Rate limiting only applied strongly to login/register, not all sensitive auth/payment/upload flows.
- Paystack webhook signature verification must be preserved and tested with the correct payload format.
- Need to verify historical secret exposure in Git history.

## Required Fixes

### 1. Protect payment proof uploads
Payment proof files should not be served with a public static `/uploads` route.

Recommended approach:
- Remove public `app.use('/uploads', express.static(...))` from `backend/server.js`.
- Store only the private uploaded filename/path in the database.
- Serve proof files through an authenticated route.
- Allow access only to admins/financial officers or the student who owns the payment.

### 2. Strengthen auth validation
- Increase password minimum from 6 characters to at least 8 characters.
- Add reset-password validation middleware.
- Apply rate limits to forgot-password, verify-otp, reset-password, and refresh-token.

### 3. Protect paid/payment actions
- Apply stricter rate limits to payment initialize, verify, manual upload, and webhook routes.
- Keep webhook route public but verify the Paystack signature before processing.

### 4. Verify secrets
- Confirm `.env`, `.env.local`, `.env.production`, and secret files are ignored.
- Run a Git history secret scan before deployment.
- Rotate any exposed key immediately.

## Database/API Changes
No database migration is strictly required if existing `proof_image_url` values continue to point to a protected route.

Recommended API behavior:
- `GET /api/payments/:id/proof` returns the proof file only after authentication and ownership/role checks.
- Existing payment list/detail endpoints can expose a protected proof URL instead of a direct `/uploads/...` public path.

## Testing Checklist
- [ ] Login still works.
- [ ] Register rejects weak passwords.
- [ ] Reset-password rejects missing/weak values.
- [ ] Forgot-password and OTP routes are rate-limited.
- [ ] Student can upload manual payment proof.
- [ ] Student can only access their own proof file.
- [ ] Another student cannot access someone else’s proof file.
- [ ] Financial secretary/admin can access proof files for review.
- [ ] Paystack webhook rejects missing/invalid signatures.
- [ ] Paystack webhook accepts valid test signatures.
- [ ] `/uploads/<filename>` no longer publicly exposes payment proof files.
- [ ] Receipts still display/download correctly if intended to be public.

## Security Notes
- Do not expose service keys, database URLs, JWT secrets, SMTP passwords, or payment secrets in frontend code.
- Keep secrets server-side only.
- Use parameterized SQL queries everywhere.
- Validate and sanitize all user input before database writes.
- Never allow users to change protected role/status/payment fields from the frontend.

## Known Issues / Follow-up
- Git history secret scan still needs to be run locally or via GitHub secret scanning.
- Full controller ownership audit should still be completed for students, dues, receipts, settings, and admin routes.
- Production monitoring/alerts should be configured on Railway/Vercel or the chosen hosting stack.

## Final Audit Notes
Before merging, run the app locally, test all payment/auth flows, review the diff, and confirm no secret values appear in frontend bundles or committed files.
