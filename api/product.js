const USER_AGENT = "FridgeQueueMVP/0.2 (https://github.com/nalm/fridge-queue-mvp)";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ message: "GET 요청만 지원합니다." });
  }

  const code = getCode(request);
  if (!code) {
    return response.status(400).json({ message: "바코드 또는 QR 값이 필요합니다." });
  }

  try {
    const product = await lookupOpenFoodFacts(code);
    if (!product) {
      return response.status(200).json({
        found: false,
        code,
        source: "manual",
        sourceLabel: "직접 입력",
        product: null
      });
    }

    return response.status(200).json({
      found: true,
      code,
      source: "openfoodfacts",
      sourceLabel: "Open Food Facts",
      product
    });
  } catch (error) {
    return response.status(502).json({
      message: "제품 데이터베이스 조회에 실패했습니다.",
      detail: error.message
    });
  }
}

async function lookupOpenFoodFacts(code) {
  if (!/^\d{6,18}$/.test(code)) return null;

  const url = `https://world.openfoodfacts.org/api/v3.6/product/${encodeURIComponent(code)}.json`;
  const result = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json"
    }
  });

  if (result.status === 404) return null;
  if (!result.ok) {
    throw new Error(`Open Food Facts 응답 오류: ${result.status}`);
  }

  const payload = await result.json();
  if (!payload.product) return null;

  const product = payload.product;
  const name = firstText(
    product.product_name_ko,
    product.product_name,
    product.generic_name_ko,
    product.generic_name
  );
  if (!name) return null;

  return {
    name,
    brand: firstText(product.brands, product.brands_tags?.[0]),
    quantity: firstText(product.quantity, "1개"),
    category: normalizeCategory(firstText(product.categories, product.categories_tags?.[0])),
    imageUrl: firstText(product.image_front_small_url, product.image_small_url)
  };
}

function getCode(request) {
  const queryCode = request.query?.code;
  if (queryCode) return sanitizeCode(queryCode);

  const requestUrl = request.url?.startsWith("http")
    ? request.url
    : `https://example.local${request.url || ""}`;
  return sanitizeCode(new URL(requestUrl).searchParams.get("code"));
}

function sanitizeCode(value) {
  return String(value || "").trim().slice(0, 160);
}

function firstText(...values) {
  return values
    .map((value) => Array.isArray(value) ? value.filter(Boolean).join(", ") : value)
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

function normalizeCategory(value) {
  const text = String(value || "").toLowerCase();
  if (/(dair|milk|yogurt|cheese|유제품|우유|치즈)/.test(text)) return "유제품";
  if (/(meat|chicken|beef|pork|육류|닭|돼지|소고기)/.test(text)) return "육류";
  if (/(seafood|fish|해산물|생선)/.test(text)) return "해산물";
  if (/(vegetable|채소|야채)/.test(text)) return "채소";
  if (/(fruit|과일)/.test(text)) return "과일";
  if (/(frozen|냉동)/.test(text)) return "냉동";
  return value || "기타";
}
