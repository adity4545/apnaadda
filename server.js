"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  });
}

loadEnv(path.join(__dirname, ".env"));

const port = Number(process.env.PORT || 4173);
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID || "793127348188-9atvaj7tvks90c6397sg30rpl0dgn8f4.apps.googleusercontent.com";
const root = __dirname;
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

function json(res, status, value) {
  const origin = ["http://127.0.0.1:5501", "http://localhost:5501"].includes(res.req && res.req.headers.origin) ? res.req.headers.origin : "http://127.0.0.1:5501";
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 1000000) req.destroy(); });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function razorpayRequest(method, endpoint, payload) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: "api.razorpay.com",
      path: endpoint,
      method,
      headers: {
        "Authorization": "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
        "Content-Type": "application/json"
      }
    }, response => {
      let body = "";
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => {
        let value;
        try { value = JSON.parse(body); } catch (error) { return reject(new Error("Invalid Razorpay response")); }
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(value.error && value.error.description || "Razorpay request failed"));
        resolve(value);
      });
    });
    request.on("error", reject);
    if (payload) request.write(JSON.stringify(payload));
    request.end();
  });
}

function googleTokenInfo(token) {
  return new Promise((resolve, reject) => {
    https.get("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token), response => {
      let body = "";
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => {
        let value;
        try { value = JSON.parse(body); } catch (error) { return reject(new Error("Invalid Google response")); }
        if (response.statusCode !== 200) return reject(new Error(value.error_description || "Google token rejected"));
        resolve(value);
      });
    }).on("error", reject);
  });
}

async function googleLogin(req, res) {
  try {
    const body = await readBody(req);
    if (!body.credential) return json(res, 400, { error: "Google credential is required" });
    const profile = await googleTokenInfo(body.credential);
    if (profile.aud !== googleClientId || profile.email_verified !== "true") return json(res, 401, { error: "Google account could not be verified" });
    json(res, 200, { user: { id: profile.sub, name: profile.name || profile.email, email: profile.email, picture: profile.picture || "" } });
  } catch (error) {
    json(res, 401, { error: error.message });
  }
}

async function createOrder(req, res) {
  if (!keyId || !keySecret) return json(res, 500, { error: "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required" });
  try {
    const body = await readBody(req);
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < 100) return json(res, 400, { error: "Amount must be an integer in paise" });
    const order = await razorpayRequest("POST", "/v1/orders", {
      amount,
      currency: "INR",
      receipt: "apnaadda_" + Date.now(),
      notes: { email: String(body.email || "") }
    });
    json(res, 200, { key_id: keyId, order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}

async function verifyPayment(req, res) {
  try {
    const body = await readBody(req);
    const expected = crypto.createHmac("sha256", keySecret).update(body.order_id + "|" + body.payment_id).digest("hex");
    json(res, 200, { verified: crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(body.signature || ""))) });
  } catch (error) {
    json(res, 400, { verified: false, error: "Invalid payment verification request" });
  }
}

function serve(req, res) {
  const requested = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: "Not found" });
  res.writeHead(200, { "Content-Type": contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { const origin = ["http://127.0.0.1:5501", "http://localhost:5501"].includes(req.headers.origin) ? req.headers.origin : "http://127.0.0.1:5501"; res.writeHead(204, { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }); return res.end(); }
  if (req.method === "POST" && req.url === "/api/create-razorpay-order") return createOrder(req, res);
  if (req.method === "POST" && req.url === "/api/verify-razorpay-payment") return verifyPayment(req, res);
  if (req.method === "POST" && req.url === "/api/google-login") return googleLogin(req, res);
  if (req.method === "GET") return serve(req, res);
  json(res, 405, { error: "Method not allowed" });
}).listen(port, () => console.log("ApnaAdda running at http://localhost:" + port));
