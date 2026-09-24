ApnaAdda — Free Bootstrap 5 Fashion Store Template

ApnaAdda is a premium, distinctively designed clothing-store template for modern
fashion e-commerce. It includes a storefront (index.html), a full shop page
(shop.html), and a product detail page (product.html). The shared cart supports
category filtering, quantity changes, secure-checkout handoff, and a WhatsApp
shopping message with the current cart contents.

Payment setup
-------------
Checkout uses Razorpay. Start the included server with Razorpay test keys:

	$env:RAZORPAY_KEY_ID="rzp_test_..."
	$env:RAZORPAY_KEY_SECRET="..."
	node server.js

The server creates orders through Razorpay and verifies the payment signature
before the browser shows a successful payment. Never place the secret key in
the frontend. Use test keys first, then replace them with live keys for launch.

WhatsApp setup
-------------
The WhatsApp action currently opens a pre-filled chat to +45 32 14 09 88.
Replace the phone value in openWhatsApp() in js/main.js with the store's
WhatsApp Business number. Automated replies and order confirmation require a
WhatsApp Business API webhook/server; the static site provides the shopping
handoff and cart message.

Render deployment
-----------------
1. Open render.com and choose New > Web Service.
2. Connect the GitHub repository `adity4545/apnaadda` and select the `main` branch.
3. Render can use render.yaml automatically. If entering settings manually, use:
	- Runtime: Node
	- Build command: leave empty
	- Start command: `node server.js`
4. Add these environment variables in Render:
	`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
5. Deploy and open the generated `https://...onrender.com/account.html` URL.
6. In Google Cloud Console, add the Render site origin as an authorized JavaScript origin.
7. Use Razorpay live keys only after testing with test keys and configuring the live domain.
