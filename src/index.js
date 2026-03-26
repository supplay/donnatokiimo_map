const webpush = require("web-push");
const https = require("https");

const APPSYNC_URL = process.env.APPSYNC_URL;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:test@example.com";

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const getUserSubscription = async (userId) => {
  const query = `
    query ListUserSubscriptions {
      listUserSubscriptions {
        items {
          id
          userId
          subscription
          userLat
          userLng
        }
      }
    }
  `;

  const body = JSON.stringify({ query });

  return new Promise((resolve, reject) => {
    const url = new URL(APPSYNC_URL);

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APPSYNC_API_KEY,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const items = json?.data?.listUserSubscriptions?.items || [];
            const found = items.find((x) => x.userId === userId);
            resolve(found || null);
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

exports.handler = async (event) => {
  console.log("Geofence Event:", JSON.stringify(event));

  const eventType = event?.detail?.EventType;
  const geofenceId = event?.detail?.GeofenceId;

  if (!geofenceId) {
    console.log("GeofenceIdなし");
    return { ok: false, reason: "missing geofenceId" };
  }

  if (eventType !== "ENTER") {
    console.log("ENTER以外はスキップ:", eventType);
    return { ok: true, skipped: true };
  }

  try {
    const user = await getUserSubscription(geofenceId);

    if (!user || !user.subscription) {
      console.log("subscriptionが見つからない:", geofenceId);
      return { ok: false, reason: "subscription not found" };
    }

    const subscription = JSON.parse(user.subscription);

    const payload = JSON.stringify({
      title: "ホカホカのお知らせ！🍠",
      body: "焼き芋屋さんが近くに来たバイ！",
      icon: "/favicon.ico",
    });

    await webpush.sendNotification(subscription, payload);

    console.log("WebPush送信成功:", geofenceId);
    return { ok: true };
  } catch (err) {
    console.error("WebPush送信失敗:", err);
    return { ok: false, error: err.message };
  }
};
