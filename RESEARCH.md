# India-focused product research

Research date: 18 October 2026. Desk research of Indian construction operators and construction-management products. This is not field interviewing or a city-specific market study: the contractor's city, scale, brand and operating process have not yet been supplied.

## User-confirmed scope
- Contractor, supervisors and clients use private project workspaces.
- Cover quotations/estimates/agreements, supplier bills/material expenses, attendance/wages/advances, and client instalments/receipts/balances.
- Work sharing means showcasing completed projects to acquire customers.
- Minimal UI and UX.

## Sources and decisions
- Powerplay: https://www.getpowerplay.in/material-management/ and https://www.getpowerplay.in/labour-management/ . Its material, attendance and site-record workflows informed separate materials and labour views.
- Construct Daily: https://www.constructdaily.com/features . Its Indian contractor workflow brings labour, bills, project costs and client receipts together. Inference: grouping each record under a project reduces searching through disconnected registers.
- WeHouse: https://www.wehouse.in/how-it-works . Its stage-based planning and payments informed explicit instalment titles, due dates, amounts received and pending balances.
- Brick & Bolt: https://www.bricknbolt.com/home-construction-company and https://customer.bricknbolt.com/features/ . Client views of progress, project documents and payments informed a restricted client workspace.
- Site Setu: https://sitesetu.in/app . Mobile site reporting and language support suggest phone-first forms. This version is English; Hindi should be prioritised after the contractor confirms the team's preference.

Vendor descriptions establish available workflow patterns, not independently proven savings. No supplier's performance claims, testimonials, exact rates or compliance claims have been reused.

## Implemented choices
- Public portfolio and enquiry form, separate from business records.
- Role checks on server endpoints, project assignments, client-specific document sharing.
- INR with Indian digit grouping; monetary values stored as integer paise and quotation arithmetic rounded deterministically.
- No default GST assumption: explicit manual tax rate, estimate labelled separately from a tax invoice.
- Agreements capture entered terms and upload signed copies; no e-signature or claim of legal validity.
- Uploaded cover photos become public only for completed projects explicitly marked for portfolio display.
- Sample data is separate from connected workspace; samples are not automatically seeded into real records.

## Next inputs
Business name, city/state, logo, contact number, completed-project photos and consent, preferred language, typical contract model (labour-only vs turnkey), actual quote/receipt/agreement formats, expected site/team counts.

## Current limits
- Owner-private deployment. Team/client membership logic is implemented, but platform audience must be enabled before other users can sign in.
- No payment collection, automated WhatsApp delivery, GST invoice issuance, electronic signature or offline synchronisation.
- Uploaded photographs support project covers and document storage; multi-photo public galleries can be added next.
- Browser preview tooling was unavailable. Type checking, production build and automated API tests were used; mobile layout and live multi-account sign-in still need browser verification.
