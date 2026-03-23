const {
  LocationClient,
  BatchUpdateDevicePositionCommand,
  PutGeofenceCommand,
} = require("@aws-sdk/client-location");

const REGION = "ap-northeast-1";
const locationClient = new LocationClient({ region: REGION });

const TRACKER_NAME = process.env.TRACKER_NAME || "DonnnatokiimoTracker";
const GEOFENCE_COLLECTION = process.env.GEOFENCE_COLLECTION || "CustomersGeofence";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
};

function createCirclePolygon(lat, lng, radiusKm) {
  const points = 32;
  const coords = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  return [coords];
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function maybe(probability) {
  return Math.random() < probability;
}

function buildWeatherMessage(weather, temp) {
  const t = Number(temp);
  const weatherText = weather || "晴れ";

  // 28種のベースセリフ（ここを元に生成）
  const basePhrases = {
    rain: [
      "雨でもほくほく！傘さして焼き芋どうぞバイ！",
      "雨の日はな、暖かい焼き芋が最高よ！心も体も温まるぞ！",
      "濡れた傘を置いて、ほかほか焼き芋をほおばりや！",
      "雨音を聞きながら焼き芋…これが粋ってもんじゃ！",
      "悪天候も吹っ飛ばす！焼き芋の力バイ！",
    ],
    snow: [
      "雪の日こそ焼き芋日和バイ！手も心もあったまるよ！",
      "雪化粧の中、熱々の焼き芋…天国じゃ！",
      "寒い…そんな時は焼き芋に限るバイ！指先までぬくぬくよ！",
      "雪見焼き芋…情緒があるな〜",
      "白い雪と金色の焼き芋のコントラスト…美しいぞ！",
    ],
    cold: [
      "今日は{temp}℃、ほかほか焼き芋がしみるバイ！",
      "{temp}℃…こりゃ焼き芋の季節だな！指が凍りそうな時はこれよ！",
      "{temp}℃でな、焼き芋の暖かさが何倍にも感じられるんじゃ！",
      "寒々{temp}℃…焼き芋がこんなに恋しいことがあるかね！",
      "{temp}℃の冷たい空気と焼き芋の温もり…最高のコンビバイ！",
    ],
    hot: [
      "今日は{temp}℃、冷たい飲み物と焼き芋の甘さが最高バイ！",
      "{temp}℃じゃな…焼き芋の甘さが一層引き立つぞ！",
      "暑い日だからこそ、甘い焼き芋が欲しくなるんよ！{temp}℃でもうまいバイ！",
      "{temp}℃…焼き芋の自然な甘さが体にしみるのう！",
      "残暑厳しい{temp}℃…焼き芋で英気を養おうぜ！",
    ],
    normal: [
      "今日は{weather}、甘くてねっとり焼き芋できちょるバイ！",
      "{weather}の中、焼き芋を焼いちょるがね！いい香りがするぞ！",
      "{weather}か…焼き芋日和じゃな！来てみりゃあ〜！",
      "今日も焼き芋の季節バイ！{weather}だからこそ、ほかほかが最高！",
      "{weather}…やっぱり焼き芋に限るな！文句なしよ！",
      "んぁ〜、今日も焼き芋おいしくできちょる！食べてきんねえ！",
      "焼き芋の甘さと香ばしさ…これが人生の楽しみよ！",
      "毎日焼き芋焼いちょるけど、飽きることなんてないんじゃ！",
    ],
  };

  let bucket = "normal";
  if (weatherText.includes("雨")) bucket = "rain";
  else if (weatherText.includes("雪")) bucket = "snow";
  else if (!Number.isNaN(t) && t <= 10) bucket = "cold";
  else if (!Number.isNaN(t) && t >= 28) bucket = "hot";

  let base = randomPick(basePhrases[bucket]);
  base = base.replaceAll("{weather}", weatherText);
  base = base.replaceAll("{temp}", Number.isNaN(t) ? "--" : String(t));

  const openers = [
    "おーい、聞いておくれ！",
    "へい、いらっしゃい！",
    "今日の焼き上がり情報じゃ！",
    "通りすがりさん、注目バイ！",
    "ほかほか速報じゃ〜！",
  ];

  const addOns = {
    rain: ["足元気をつけて来んね。", "湯気までごちそうじゃ。", "体の芯から温まるぞ。"],
    snow: ["手袋のままでも香りでわかるぞ。", "白い景色に甘い香りが映えるのう。", "帰り道までぽかぽかバイ。"],
    cold: ["手がかじかむ前にどうぞ。", "猫舌でもゆっくり楽しめるぞ。", "今日みたいな寒さにぴったりじゃ。"],
    hot: ["塩気のあるおやつと相性抜群じゃ。", "甘さで元気チャージしていきんしゃい。", "暑さに負けん体づくりバイ。"],
    normal: ["一本食べたら笑顔になるぞ。", "香りだけでも幸せじゃろ？", "おみやげにも人気バイ。"],
  };

  const closers = [
    "待っとるけんね！",
    "気軽に声かけてな！",
    "今日もええ芋、焼けちょるよ！",
    "売り切れ前にどうぞバイ！",
  ];

  let message = base;
  if (maybe(0.6)) message = `${randomPick(openers)} ${message}`;
  if (maybe(0.7)) message = `${message} ${randomPick(addOns[bucket])}`;
  if (maybe(0.65)) message = `${message} ${randomPick(closers)}`;

  return message;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;

    if (action === "updateOjisanPosition") {
      const { lat, lng, deviceId = "Ojisan-Mobile-001" } = body;
      const command = new BatchUpdateDevicePositionCommand({
        TrackerName: TRACKER_NAME,
        Updates: [
          {
            DeviceId: deviceId,
            Position: [lng, lat],
            SampleTime: new Date(),
          },
        ],
      });
      await locationClient.send(command);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }

    if (action === "registerUserGeofence") {
      const { userId, lat, lng, radiusKm = 1.0 } = body;
      const command = new PutGeofenceCommand({
        CollectionName: GEOFENCE_COLLECTION,
        GeofenceId: `fence-${userId}`,
        Geometry: {
          Polygon: createCirclePolygon(lat, lng, radiusKm),
        },
      });
      await locationClient.send(command);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }

    const message = buildWeatherMessage(body.weather, body.temp);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message }),
    };
  } catch (error) {
    console.error("Lambda Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};