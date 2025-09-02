# Business Project – Frontend

A React (CRA) frontend for a small business dashboard: authentication, products, invoices, dashboard statistics, CSV upload, and more.

Deployed apps
- Frontend (Vercel): https://client-businessproject.vercel.app/
- Backend (Render): https://server-businessproject.onrender.com/

Source code
- Frontend repo: https://github.com/Vishnus1111/client-businessproject
- Backend repo: https://github.com/Vishnus1111/server-businessproject

Important note about hosted performance
- All features work on the hosted URLs, but both services use free plans with cold starts and throttling. Initial requests (especially CSV upload and dashboard aggregates) can take longer than localhost. Toast notifications and UI flows are functional; delays are due to platform spin‑up, not code issues.
- Forgot Password OTP emails can take up to ~5 minutes to arrive due to email provider throttling on free tiers. Please wait patiently and check your Spam/Junk folder; the functionality works, delivery can just be delayed.
- The main visible lag is with toast notifications and UI state updates on the hosted app. Actions complete on the backend, but the toast/state can render a few seconds late. If needed, wait briefly or refresh the page; functionality remains correct.

## Features (what to test)
- Auth: Sign up, Log in, Forgot password with OTP email, Reset password
- Products: List, search, add, edit, delete; low‑stock indicators; reactive “Ordered” counter
- CSV Upload: Bulk create products from CSV (see exact format below)
- Invoices: Create invoice, view printable invoice, download/print
- Dashboard/Statistics: Inventory summary, top products, weekly/monthly/yearly stats with percent change
- Settings: Profile basics

## Run locally
1) Install and start
- Node 18+
- From frontend/client:
	- npm install
	- Create .env with REACT_APP_API_URL pointing to your backend
		- Example: REACT_APP_API_URL=http://localhost:5000
	- npm start

2) Backend (separate repo folder)
- Ensure the backend is running locally on the port you set in REACT_APP_API_URL.

## Environment
- REACT_APP_API_URL (required) – Base URL of the backend API.
	- On Vercel, this is configured in the project settings. Locally, place it in frontend/client/.env.

## CSV upload – exact format (required headers + sample rows)
The CSV must include the column header row and at least one data row, otherwise the upload will be rejected. Dates should be in YYYY-MM-DD.

Required headers
- productName, productId, category, description (optional), costPrice, sellingPrice, quantity, unit, expiryDate, thresholdValue

Sample CSV (copy/paste into a file like products-sample.csv)
```csv
productName,productId,category,costPrice,sellingPrice,quantity,unit,expiryDate,thresholdValue
Red Label Tea 500g,,Beverages,120,150,30,pack,2025-12-31,5
Basmati Rice 5kg,,Groceries,450,520,20,bag,2026-03-15,4
Amul Toned Milk 1L,,Dairy,38,45,100,litre,2025-10-01,10
Good Day Biscuits 10pk,,Snacks,90,120,50,pack,2026-01-20,8
```
Notes
- description is optional; all other fields are required by the backend Product model.
- expiryDate must be a valid date; products with past dates are marked “Expired”.
- sellingPrice is the price used; a legacy price field is auto-set from it by the backend.
- ownerEmail/userId are taken from the logged‑in user and not part of the CSV.
- and the product ID field to be left empty so that the backend will generate an randomized product id automatically.

Common CSV issues
- Missing header row – add the exact header names as above.
- Extra/unknown columns – are ignored if present, but keep the required ones.
- Wrong date format – use YYYY-MM-DD.

## How to test the CSV flow
1) Log in to the app.
2) Go to Product page and open the CSV upload.
3) Use the sample CSV above; ensure the header row is included.
4) Submit and watch for toast notifications (success/errors). On the hosted app, the first request may take a few seconds due to free-tier cold starts.

## Tech stack
- React 18/CRA, react-toastify, axios/fetch
- CSS Modules
- Deployed on Vercel (frontend) and Render (backend)

## Troubleshooting
- Slow first request – This is expected on free plans. Subsequent calls and state loading may be relatively faster, but some lag will still be noticeable since the site is hosted on a free tier. Please test with patience.


