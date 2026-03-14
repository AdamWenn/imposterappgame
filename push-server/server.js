import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import webPush from "web-push";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const subscriptionsFile = path.join(process.cwd(), "subscriptions.json");
const publicUrl = process.env.PUBLIC_APP_URL || "http://localhost:5500";
const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
  throw new Error("Missing VAPID env vars. Set VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.");
}

webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "200kb" }));

function readSubscriptions() {
  try {
    return JSON.parse(fs.readFileSync(subscriptionsFile, "utf8"));
  } catch {
    return [];
  }
}

function writeSubscriptions(subscriptions) {
  fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
}

function subscriptionKey(subscription) {
  return subscription.endpoint;
}

app.get("/api/config", (_req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.post("/api/subscriptions", (req, res) => {
  const subscription = req.body && req.body.subscription;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Missing subscription payload." });
    return;
  }

  const subscriptions = readSubscriptions();
  const next = subscriptions.filter((item) => subscriptionKey(item) !== subscriptionKey(subscription));
  next.push(subscription);
  writeSubscriptions(next);
  res.status(201).json({ ok: true, count: next.length });
});

app.post("/api/send-test-notification", async (req, res) => {
  const title = req.body && req.body.title ? String(req.body.title) : "Hi!";
  const body = req.body && req.body.body ? String(req.body.body) : "Imposter test push";
  const subscriptions = readSubscriptions();

  if (!subscriptions.length) {
    res.status(400).json({ error: "No subscriptions saved yet." });
    return;
  }

  const payload = JSON.stringify({
    title,
    body,
    tag: "imposter-test-hi",
    url: publicUrl
  });

  const active = [];
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(subscription, payload);
        active.push(subscription);
      } catch (error) {
        if (error.statusCode !== 404 && error.statusCode !== 410) {
          active.push(subscription);
          throw error;
        }
      }
    })
  );

  writeSubscriptions(active);

  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length) {
    res.status(207).json({
      ok: false,
      sent: results.length - rejected.length,
      failed: rejected.length
    });
    return;
  }

  res.json({ ok: true, sent: results.length });
});

app.listen(port, () => {
  console.log(`Push server listening on http://localhost:${port}`);
});
