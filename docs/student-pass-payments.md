
# Student Pass payments

One Student Pass covers every currently published paid test and any paid tests added during the season. The Question Bank and PYQs, including PYQ tests, stay free. Existing tests retain their free access on migration. New regular tests require the pass by default, and administrators can change that in Test authoring. Use that control to designate free sample mocks and any existing tests you want to sell. A pass does not change the per-test attempt limit or publication and scheduling rules. Students can finish an existing timed attempt and review their released scores, solutions and analytics after expiry.

The standard price is ₹299 (29900 paise). The Student Pass admin tab allows one named offer at a time with an INR price and an IST start/end. Returning students see the currently applicable price. If an unpaid checkout has a different price, the backend checks Razorpay for a captured or in-progress payment before replacing it with a new order at the current price. The original Razorpay order and amount stay on file. A late payment on a replaced checkout goes to refund review and does not activate a second pass. Only one checkout order per student and season is open at a time. A completed full refund frees that slot.

| Milestone | India time |
| --- | --- |
| Sales close | 00:00 on 30 June 2027 |
| Access ends | 00:00 on 1 July 2027 |

A verified primary capture automatically activates the pass if the payment was initiated before the sales cutoff and confirmed before the season ended. Orders captured under the previous workflow follow the same eligibility rule, including orders that were awaiting approval. No database backfill is required. Charges past the cutoff, captures confirmed after expiry, and duplicate captures go to refund review.

Students can request a refund through support. An authorized administrator must approve it in the Student Pass screen and enter a reason before the app submits a full refund to Razorpay. Use the same screen for confirmed duplicate charges or approved exceptions. Access stops once the admin initiates a refund. A failed refund stays blocked pending support action. Use the application for refunds so it can register the operation before contacting Razorpay.

Student requests to protected FastAPI routes use one mobile and one desktop slot per account. The slot binds to the verified Supabase Auth session ID. The API uses the browser's reported form factor, so this is a browser session limit rather than physical device attestation. Students can confirm replacing a slot. Public question and PYQ browsing is still available without sign-in.

## Stage and enable

1. On an isolated Supabase project, provision the existing least-privilege `nimcet_backend` role before applying the payment migration. The migration grants that role access to the payment tables and installs role-scoped RLS policies. Anonymous and authenticated Data API roles have no direct access to payment tables. The payment API relies on the runtime role and the existing trusted admin role assignments.
2. Configure the staging backend with `TRUSTED_ROLE_LOOKUP_ENABLED=true`, `TEST_ENGINE_ENABLED=true`, `ADMIN_WORKFLOWS_ENABLED=true`, and the three Razorpay settings from `backend/.env.example`. Use Razorpay Test Mode keys and a distinct webhook secret. Ensure the existing PYQ workflow is enabled and verified in the intended environment if the PYQ test catalog should be visible.
3. Enable automatic capture in Razorpay and configure an HTTPS webhook at `/api/v1/payments/webhooks/razorpay`. Subscribe to `payment.captured`, `refund.created`, `refund.processed`, and `refund.failed`. Keep the test-mode keys and webhook secret in staging only. Enable `PAYMENTS_ENABLED=true` in staging and verify `/ready`.
4. Confirm a sandbox payment with a student account that has no pass. Close checkout during a second run to exercise the webhook-only path. Confirm that the verified capture immediately activates the pass, updates the profile tier and unlocks a regular paid test. Confirm a free sample and a PYQ still work without a pass. Test offer expiry, device replacement and an admin-approved full refund.
5. On your backend host, schedule `python scripts/reconcile_pass_payments.py --limit 50` from the backend directory, using the same environment and runtime database role as the API. It retrieves pending checkout and refund states from Razorpay without creating charges or refunds. Monitor nonzero exits and the admin refund queue. Use **Check Razorpay** on an affected order for immediate reconciliation.
6. After staging sign-off, ensure the payment migration is applied, choose the free mock samples in admin, configure the live merchant keys and separately registered live webhook, and enable the feature. Deploy the updated backend before the admin and student UI. Perform a controlled live purchase, verify automatic activation, then verify an admin-approved refund before opening broadly.

To halt new checkout while keeping pass access, webhooks and refunds running, set `PAYMENTS_CHECKOUT_ENABLED=false`. Leave `PAYMENTS_ENABLED=true` once purchases exist. A payment already initiated in Razorpay can still be captured.

Razorpay references: [Checkout and capture](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [refunds](https://razorpay.com/docs/api/refunds/).
