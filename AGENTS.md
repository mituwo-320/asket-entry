# Participant design direction

The owner approved the basketball court illustration and charcoal/crimson palette on 2026-10-16 and asked to retain this approach for future work.

- Build atmosphere with a crafted, sport-specific illustrated background, tactile print textures, layered panels, and restrained light and shadow.
- Let the hoop, ball, and court remain recognizable around the content. Do not replace this character with plain flat surfaces or generic gradient decorations.
- Use charcoal, crimson, warm paper white, and clear typography. Preserve high contrast, light input fields, visible focus, and generous touch targets.
- Give each participant page a deliberate composition and clear next action. Background art must support the task without competing with forms or long text.
- Reuse the approved asset at `public/basketball-court-background.webp`; the source prompt is in `docs/basketball-background.md`.
- Keep decorative images out of printed invoices and receipts. Preserve financial calculations, receipt issuance/view rules, authentication, API payloads, and editing deadlines during visual changes.
- See `docs/participant-design.md` for the recorded design decisions.

This direction applies to participant pages. Changes to operations/admin screens need their own task scope.

On 2026-10-18 the owner separately requested improvements to operations pages. The `/management` design and validation boundaries are recorded in `docs/operations-design.md`. Keep `/admin` pages and shared bracket/print implementations outside ordinary operations styling changes.

The owner subsequently approved refining the team detail modal and bracket/fullscreen controls. Shared bracket components may expose an optional operations-only appearance; preserve their default admin appearance, match geometry, state transitions, and all existing handlers.

On 2026-10-18 the owner explicitly requested the `/admin` pages and a full review. Apply the same court illustration, charcoal/crimson and paper textures to admin pages and dialogs, using the opt-in `admin` bracket appearance. Preserve financial/deadline/authentication/receipt and match rules. See `docs/admin-design-review.md` for the inventory, specific nonvisual corrections, checks and remaining verification limits.

On 2026-10-18 the owner requested production-readiness checks and necessary fixes across the app. Authentication/authorization, input validation and data-integrity corrections are explicitly in scope for this task. Record intentional nonvisual changes and release conditions in `docs/production-readiness.md`. Do not equate mocked tests or a successful build with real DB/SMTP validation, and do not publish to production or merge as part of a readiness review. Keep pricing, print and match calculation rules intact.
