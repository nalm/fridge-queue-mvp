const DEFAULT_MODEL = "gpt-5.5";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    platform: { type: "string" },
    purchaseDate: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          category: { type: "string" },
          storage: { type: "string", enum: ["냉장", "냉동", "실온"] },
          purchaseDate: { type: "string" },
          expiresAt: { type: "string" },
          shelfLifeDays: { type: "number" },
          confidence: { type: "number" }
        },
        required: ["name", "quantity", "category", "storage", "purchaseDate", "expiresAt", "shelfLifeDays", "confidence"]
      }
    }
  },
  required: ["platform", "purchaseDate", "items"]
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "POST 요청만 지원합니다." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response.status(501).json({
      message: "이미지 자동 추출을 쓰려면 Vercel 환경변수 OPENAI_API_KEY를 설정하세요."
    });
  }

  try {
    const body = await readJsonBody(request);
    if (!body.image || typeof body.image !== "string") {
      return response.status(400).json({ message: "이미지 데이터가 없습니다." });
    }

    const platform = sanitizeText(body.platform || "쇼핑몰");
    const purchaseDate = sanitizeText(body.purchaseDate || new Date().toISOString().slice(0, 10));
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

    const result = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "한국어 쇼핑몰 구매내역 이미지에서 냉장고에 넣을 식재료만 추출하세요.",
                  `플랫폼 후보: ${platform}`,
                  `구매일 후보: ${purchaseDate}`,
                  "생활용품, 조리도구, 배송비, 할인, 결제 문구는 제외하세요.",
                  "소비기한이 이미지에 보이면 그 날짜를 expiresAt으로 쓰고, 없으면 식품군별 보관 기간을 보수적으로 추정하세요.",
                  "expiresAt은 YYYY-MM-DD 형식으로만 답하세요.",
                  "confidence는 0부터 1 사이 숫자입니다."
                ].join("\n")
              },
              {
                type: "input_image",
                image_url: body.image
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "purchase_extract",
            strict: true,
            schema: responseSchema
          }
        },
        max_output_tokens: 1800
      })
    });

    const payload = await result.json();
    if (!result.ok) {
      return response.status(result.status).json({
        message: payload?.error?.message || "OpenAI 이미지 분석 요청에 실패했습니다."
      });
    }

    const text = payload.output_text || payload.output?.[0]?.content?.[0]?.text;
    if (!text) {
      return response.status(502).json({ message: "추출 결과가 비어 있습니다." });
    }

    return response.status(200).json(JSON.parse(text));
  } catch (error) {
    return response.status(500).json({ message: error.message || "서버 오류가 발생했습니다." });
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !isReadableStream(request.body)) {
    return request.body;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function isReadableStream(value) {
  return value && typeof value.pipe === "function";
}

function sanitizeText(value) {
  return String(value).replace(/[<>]/g, "").slice(0, 80);
}
