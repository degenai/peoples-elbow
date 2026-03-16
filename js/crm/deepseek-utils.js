const USEFUL_FIELDS = ['correctName', 'address', 'neighborhood', 'phone', 'businessType'];

function parseDeepseekContent(content) {
  const cleaned = String(content ?? '').replace(/```json\n?|\n?```/g, '').trim();
  if (!cleaned) {
    return { data: {}, warning: 'No business details found' };
  }

  const parsed = JSON.parse(cleaned);
  const businessInfo = parsed && typeof parsed === 'object' ? parsed : {};
  const hasUsefulData = USEFUL_FIELDS.some((key) => {
    return typeof businessInfo[key] === 'string' && businessInfo[key].trim();
  });

  return {
    data: businessInfo,
    warning: hasUsefulData ? undefined : 'No business details found'
  };
}

/**
 * Build a request body for DeepSeek to PARSE extracted text into structured JSON.
 * This does NOT use web_search - it only parses text that was already scraped.
 *
 * @param {string} extractedText - Raw text from Google Knowledge Panel or similar
 * @param {string[]} existingNeighborhoods - Optional list of known neighborhoods
 * @returns {Object} Request body for DeepSeek API
 */
function buildParseRequestBody(extractedText, existingNeighborhoods = []) {
  const neighborhoodHint = existingNeighborhoods.length > 0
    ? `\n\nKNOWN NEIGHBORHOODS (prefer these if applicable): ${existingNeighborhoods.join(', ')}`
    : '';

  return {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `You are a data extraction assistant. Parse the provided text (scraped from a Google search result) and extract business information.

Return ONLY valid JSON with no markdown formatting or code blocks. Use this exact structure:
{
  "correctName": "the business name exactly as shown",
  "address": "full street address or empty string",
  "neighborhood": "area/district if mentioned or empty string",
  "phone": "phone number in format (XXX) XXX-XXXX or empty string",
  "hours": "business hours summary or empty string",
  "businessType": "type of business or empty string",
  "rating": "star rating if shown (e.g., '4.5') or empty string",
  "reviewCount": "number of reviews if shown or empty string",
  "website": "website URL if shown or empty string",
  "confidence": "high/medium/low based on data quality"
}

RULES:
1. Only extract information that is clearly present in the text
2. Do not guess or infer missing information - use empty strings
3. Clean up formatting (remove extra whitespace, normalize phone numbers)
4. If the text appears to be an error page or CAPTCHA, return all empty strings with confidence "low"${neighborhoodHint}`
      },
      {
        role: 'user',
        content: `Extract business information from this text:\n\n${extractedText}`
      }
    ],
    temperature: 0,
    max_tokens: 500
  };
}

export {
  parseDeepseekContent,
  buildParseRequestBody
};
