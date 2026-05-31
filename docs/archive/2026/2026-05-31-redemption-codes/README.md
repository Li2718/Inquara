# Redemption Codes

> status: archived
> purpose: Add registration gating on top of an extensible redemption code system.

## Goal

Require a valid invitation code for new user registration in the current product, implemented internally as a redemption code system. Administrators manage redemption codes from the admin surface, while product-facing UI copy may call registration-eligibility redemption codes "invitation codes".

The first implementation should stay intentionally small, but the domain model must treat codes as redemption codes. In this first slice, the redeemable item is `registration eligibility`. Future versions may allow codes to come from rewards, purchase, unlimited user invites, campaigns, or other entitlement sources. Codes may also later redeem privileges, balance, referral rewards, or other benefits.

## Boundary

### Included

- Require a registration-eligibility redemption code during password registration when registration is invitation-only.
- Add an administrator setting for whether registration is invitation-only.
- Local development and test environments default invitation-only registration to off, except in tests or manual sessions that explicitly enable this feature.
- Production defaults invitation-only registration to on through the production deployment configuration.
- Validate redemption code status before creating an account.
- Consume or record redemption code usage atomically with user creation.
- Add administrator-only redemption code generation in the admin surface.
- Generated codes are random.
- Code generation supports an optional note.
- Code generation supports an optional validity period:
  - default: never expires
  - relative duration: valid for a chosen number of days
  - absolute expiry: valid until a chosen date
- Code generation supports an optional maximum redemption count:
  - default: `1`
- Add an admin list for existing codes.
- The admin list shows whether a code has been used.
- The admin list shows which user or users redeemed a used code.
- The admin list shows the code source, including which administrator created it for admin-generated codes.
- Add code disabling so administrators can make an unused or still-available code no longer redeemable.
- Store enough structured redemption code data to support future issuer/source/use-case expansion.
- Keep redemption logic behind domain/service boundaries instead of embedding it directly in form handlers.
- Add meaningful tests for registration gating, code consumption, and admin-only generation.
- Update durable architecture documentation if implementation creates long-term auth, admin, or redemption code rules.

### Not Included

- OAuth registration integration.
- Referral rebates, commission settlement, or upstream/downstream payout logic.
- Paid redemption code purchase.
- Recharge rewards or balance grants.
- Unlimited user-generated invite links.
- Campaign management.
- Privilege or entitlement delivery beyond recording extensible metadata.
- Public invite-code discovery or self-service code generation by normal users.

## Working Rule

This initiative README is the source of truth for live task status. When design or implementation changes the actual task list, update `Completed Work`, `Remaining Work`, or `Deferred Work` in the same change before continuing.

## Naming Rule

- Code, database, API, services, tests, and documentation for internal architecture must use `redemption code` naming.
- Frontend product copy may use "invitation code" when the redemption target is `registration eligibility`.
- Do not create backend models, API routes, services, or command names with `invitationCode` naming unless the object is strictly presentation-only.
- If a future target is not registration eligibility, its UI copy should use a product-appropriate label instead of inheriting "invitation code".

## Code Generation Rule

- Generate codes with a cryptographically secure random source.
- Use an unambiguous uppercase alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Default to 6 characters for the first slice.
- Store the current generated code length in a typed global setting, not as an administrator-facing option.
- Store normalized codes without separators and compare case-insensitively after normalization.
- Product UI may display longer codes in grouped chunks, but the first 6-character codes do not need visual separators.
- Do not encode target, issuer, date, role, or privileges into the code string. Store those as structured fields.
- Add a unique index on the normalized code.
- On collision, retry generation with a fresh random value.
- Do not count existing codes on every generation request.
- Treat repeated unique-index collisions as an expansion checkpoint, not as immediate failure.
- At the collision checkpoint, count all issued codes at the current length, including disabled and expired codes, because they still occupy unique code values.
- Increase generated length only when collision checkpoint occupancy is at or above the namespace threshold.
- If occupancy is below the threshold, keep the current length and continue retrying until the request-level attempt limit is reached.
- Keep collision detection delegated to the database unique index, then retry with a fresh random value.

## Product Requirements

### Admin Controls

- The first admin route should be short: `/admin/codes`.
- Administrators can toggle whether registration requires a code.
- Administrators can generate random codes.
- Administrators can add a note when generating a code.
- Administrators can leave expiry empty for no expiry.
- Administrators can choose a number of valid days or an exact expiry date.
- Administrators can set how many users may redeem a code; default is one.
- Administrators can disable a code.
- Administrators can view all generated codes, their status, redemption count, note, expiry, source, creator, and redemption users.
- If exactly one user has redeemed a code, show that user directly in the list.
- If multiple users have redeemed a code, show a compact label such as `Alice and 3 others`, with an expandable detail view for the full user list.

### Registration

- When invitation-only registration is enabled, registration requires a valid redemption code for the `registration eligibility` target.
- When invitation-only registration is disabled, ordinary registration should work without a code.
- When invitation-only registration is disabled, the registration form should fold the code field away as an optional field.
- If a user provides a valid code while invitation-only registration is disabled, redeem it for attribution/future effects.
- Registration error copy should not help enumerate codes. Use a generic unavailable/expired style message for invalid, expired, disabled, exhausted, or otherwise unusable codes.

## Architecture Notes

- Treat "invitation code" as product-facing copy for a durable redemption code whose target is registration eligibility.
- Model `registration eligibility` as the first redeemable target, not as a hard-coded special case attached only to password signup.
- Store product-wide configurable switches in a general settings table, starting with the invitation-only registration setting.
- The settings layer must validate known keys and value shapes at the service boundary so the generic table does not leak untyped values into auth logic.
- Admin UI may display redemption codes in full plaintext.
- Separate code issuance, redeemable target, and redemption:
  - issuance describes who or what created the code and why it exists
  - redeemable target describes what the code can be exchanged for
  - redemption describes who used the code, when, and what target was redeemed
- The first supported issuance source is administrator generation.
- Admin-generated codes record the creator administrator.
- The first supported redemption action is user registration.
- The first supported target is registration eligibility.
- Store redemptions as separate records from the code itself so multi-use codes and future reward histories do not overload a single `usedByUserId` column.
- Keep room for future source types such as admin grant, user referral, purchase, recharge reward, campaign, or system grant.
- Keep room for future redemption effects such as registration allowance, account privilege, bonus balance, or referral attribution.
- Prefer explicit status fields over deleting or overwriting used codes.
- Include a disabled status such as `disabledAt` rather than deleting codes.
- Avoid assuming all codes are single-use forever, even if the first product behavior is single-use.
- Avoid coupling redemption validation to password-only auth, because OAuth registration may later need the same gate.

## Completed Work

- Created the invitation codes initiative.
- Reframed invitation codes as redemption codes whose first redeemable target is registration eligibility.
- Renamed the initiative to Redemption Codes and made `redemption code` the required internal code/API/domain naming.
- Added first-slice admin requirements for registration gating, random code generation, optional note, optional expiry, optional redemption limit, and redemption visibility.
- Added decisions for `/admin/codes`, local/test default-off behavior, production default-on requirement, disabled codes, creator/source display, compact multi-user redemption display, optional folded registration code field when gating is off, and generic invalid-code errors.
- Decided to store product-wide switches in a general settings table, with typed validation at the service boundary.
- Decided that admin UI may show redemption codes in full plaintext.
- Deferred production default-on wiring until deployment configuration is formalized.
- Implemented invitation-only registration gating.
- Added `SystemSetting`, `RedemptionCode`, and `RedemptionCodeRedemption` database models and migration.
- Added typed invitation-only registration setting accessors.
- Added redemption code service logic for secure random generation, normalization, collision retry, length growth, validation, redemption, listing, and disabling.
- Added admin HTTP APIs under `/admin/codes` and `/admin/settings/registration`.
- Added registration settings API for the public registration form.
- Integrated redemption code validation and redemption into password registration in the same transaction as account creation.
- Added admin UI at `/admin/codes` for toggling registration gating, generating codes, viewing source/creator/redemptions, expanding multi-user redemption details, and disabling codes.
- Added `/admin` as the temporary admin entrypoint redirecting to `/admin/codes`.
- Added a shared app top bar for the product canvas and admin surface, including the administrator account-menu entry to the admin backend.
- Added the first admin sidebar with the current invitation-code settings page.
- Updated registration UI so invitation-only mode requires an invitation code, while open registration folds the optional code field away.
- Added behavior-focused API tests for default-open test behavior, invitation-only gating, code redemption/exhaustion, admin listing/disable behavior, and non-admin rejection.
- Updated long-term architecture documentation with system setting and redemption code rules.
- Added tests following `docs/testing-standards.md`.
- Connected the production default invitation-only behavior through the production deployment configuration.

## Remaining Work

- None.

## Deferred Work

- OAuth registration redemption code flow.
- Referral, rebate, commission, or payout behavior.
- Paid redemption code purchase.
- Recharge rewards and account balance grants.
- User-generated invite links.
- Campaign management.
- Redemption code privilege grants.
- Removing the registration code requirement.

## Related Documents

- [Architecture](../../../architecture.md)
- [Testing Standards](../../../testing-standards.md)
- [UI System](../../../ui-system.md)
- [Documentation Standards](../../../documentation-standards.md)

## Archive Criteria

- Registration requires a valid registration-eligibility redemption code when invitation-only registration is enabled.
- Admin users can generate redemption codes from the admin surface.
- Redemption code validation and redemption are covered by meaningful tests.
- The implementation preserves an extensible distinction between issuance, redemption, status, and future effects.
- Durable redemption code architecture rules are reflected in current documentation where appropriate.
