
# Student Pass payments

One Student Pass covers every currently published paid test and any paid tests added during the season. The Question Bank and PYQs, including PYQ tests, stay free. Existing tests retain their free access on migration. New regular tests require the pass by default, and administrators can change that in Test authoring. Use that control to designate free sample mocks and any existing tests you want to sell. A pass does not change the per-test attempt limit or publication and scheduling rules. Students can finish an existing timed attempt and review their released scores, solutions and analytics after expiry.

The standard price is ₹299 (29900 paise). The Student Pass admin tab allows one named offer at a time with an INR price and an IST start/end. The order fixes the displayed amount. A student can resume an existing unpaid order at its original price until the sales cutoff. Only one checkout order per student and season is open at a time. A completed full refund frees that slot.

| Milestone | India time |
| --- | --- |
| Sales close | 00:00 on 30 June 2027 |
| Access ends | 00:00 on 1 July 2027 |
| Manual review deadline | 24 hours after confirmed capture, including weekends |

If an existing checkout initiates a payment after the cutoff, it goes to refund review. Payments initiated before the cutoff can still be approved up to the season expiry. The admin approval queue flags overdue payments. The pass page gives the student a support link and order reference. At expiry, remaining unapproved payments move to refund review. Full refunds require an authorized administrator and a recorded reason. Use the same screen for confirmed duplicate charges or approved exceptions. Once a refund is requested, activation and access from that purchase stop. A failed refund stays blocked pending support action. This workflow issues full refunds only. Use the application for refunds so it can register the operation before contacting Razorpay.

Student requests to protected FastAPI routes use one mobile and one desktop slot per account. The slot binds to the verified Supabase Auth session ID. The API uses the browser's reported form factor, so this is a browser session limit rather than physical device attestation. Students can confirm replacing a slot. Public question and PYQ browsing is still available without sign-in.

## Stage and enable

1. On an isolated Supabase project, provision the existing least-privilege `nimcet_backend` role before applying the payment migration. The migration grants that role access to the payment tables and installs role-scoped RLS policies. Anonymous and authenticated Data API roles have no direct access to payment tables. The payment API relies on the runtime role and the existing trusted admin role assignments.
2. Configure the staging backend with `TRUSTED_ROLE_LOOKUP_ENABLED=true`, `TEST_ENGINE_ENABLED=true`, `ADMIN_WORKFLOWS_ENABLED=true`, and the three Razorpay settings from `backend/.env.example`. Use Razorpay Test Mode keys and a distinct webhook secret. Ensure the existing PYQ workflow is enabled and verified in the intended environment if the PYQ test catalog should be visible.
3. Enable automatic capture in Razorpay and configure an HTTPS webhook at `/api/v1/payments/webhooks/razorpay`. Subscribe to `payment.captured`, `refund.created`, `refund.processed`, and `refund.failed`. Keep the test-mode keys and webhook secret in staging only. Enable `PAYMENTS_ENABLED=true` in staging and verify `/ready`.
4. Confirm a sandbox payment with a student account that has no pass. Close checkout during a second run to exercise the webhook-only path. In the admin app, confirm that capture alone does not unlock a regular paid test, then approve the order and start the test. Confirm a free sample and a PYQ still work without a pass. Test offer expiry, device replacement, and a full refund.
5. On your backend host, schedule `python scripts/reconcile_pass_payments.py --limit 50` from the backend directory, using the same environment and runtime database role as the API. It retrieves pending checkout and refund states from Razorpay without creating charges or refunds. Monitor nonzero exits and the admin refund queue. Use **Check Razorpay** on an affected order for immediate reconciliation.
6. After staging sign-off, apply the reviewed migration to the live database, choose the free mock samples in admin, configure the live merchant keys and separately registered live webhook, and enable the feature. Perform a controlled live purchase, approval and refund before opening broadly.

To halt new checkout while keeping pass access, review, webhooks and refunds running, set `PAYMENTS_CHECKOUT_ENABLED=false`. Leave `PAYMENTS_ENABLED=true` once purchases exist. A payment already initiated in Razorpay can still be captured and appears in the review flow.

Razorpay references: [Checkout and capture](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [refunds](https://razorpay.com/docs/api/refunds/).
