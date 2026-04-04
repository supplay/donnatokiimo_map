import {
  LocationClient,
  BatchUpdateDevicePositionCommand,
} from "@aws-sdk/client-location";

const client = new LocationClient({
  region: process.env.AWS_REGION,
});

const TRACKER_NAME = process.env.TRACKER_NAME || "DonnnatokiimoTracker";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
};

export const handler = async (event) => {
  console.log("AWS_REGION =", process.env.AWS_REGION);
  console.log("TRACKER_NAME =", TRACKER_NAME);
  console.log("event:", JSON.stringify(event, null, 2));

  try {
    const payload =
      typeof event?.body === "string" ? JSON.parse(event.body) : event;

    const id = payload?.id;
    const lat = payload?.lat;
    const lng = payload?.lng;
    const isOperating = payload?.isOperating;
    const forceEnter = payload?.forceEnter === true;

    if (!id) {
      throw new Error("id がありません");
    }

    if (!isOperating) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true, skipped: true, reason: "not operating" }),
      };
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      throw new Error("lat/lng が不正です");
    }

    // forceEnter: バンが既にジオフェンス内にいる場合でも ENTER を発火させるため
    // 先にダミー位置（赤道/0,0）で一度 EXIT させ、直後に実際の位置で ENTER させる
    if (forceEnter) {
      const dummyCommand = new BatchUpdateDevicePositionCommand({
        TrackerName: TRACKER_NAME,
        Updates: [
          {
            DeviceId: id,
            Position: [0, 0],
            SampleTime: new Date(Date.now() - 2000),
          },
        ],
      });
      await client.send(dummyCommand);
      console.log("forceEnter: ダミー位置を送信しました");
      // EventBridge がジオフェンス評価を完了するまで少し待つ
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const command = new BatchUpdateDevicePositionCommand({
      TrackerName: TRACKER_NAME,
      Updates: [
        {
          DeviceId: id,
          Position: [lng, lat],
          SampleTime: new Date(),
        },
      ],
    });

    const result = await client.send(command);
    console.log("BatchUpdateDevicePosition result:", JSON.stringify(result));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true, trackerName: TRACKER_NAME, forceEnter, result }),
    };
  } catch (error) {
    console.error("sync error:", error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
