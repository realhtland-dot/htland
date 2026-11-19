import { GoogleGenAI, Type } from '@google/genai';
import { extractVietnamesePhones } from '../utils/phone.ts';

export type RealEstateIntent =
  | 'BUY_LAND'
  | 'BUY_HOUSE'
  | 'SELL_LAND'
  | 'SELL_HOUSE'
  | 'RENT'
  | 'LEASE'
  | 'INVEST'
  | 'PROJECT_INFO'
  | 'BROKER'
  | 'UNCLEAR';

export type PropertyType = 'LAND' | 'HOUSE' | 'APARTMENT' | 'VILLA' | 'COMMERCIAL' | 'OTHER';
export type LeadPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RealEstateAiAnalysisResult {
  customer_name: string | null;
  phone: string | null;
  phones: string[];
  intent: RealEstateIntent;
  property_type: PropertyType | null;
  province: string | null;
  district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  area_min: number | null;
  area_max: number | null;
  legal_requirement: string | null;
  lead_score: number;
  priority: LeadPriority;
  summary: string;
  next_action: string;
  provider: 'gemini' | 'openai';
  model: string;
}

const SYSTEM_INSTRUCTION = `Bạn là chuyên gia phân tích hội thoại khách hàng bất động sản Việt Nam cho hệ thống Realty Messenger CRM.
Nhiệm vụ: Đọc nội dung tin nhắn hoặc đoạn hội thoại Messenger và trích xuất dữ liệu cấu trúc JSON chính xác.

Quy tắc BẮT BUỘC:
1. KHÔNG tự bịa thông tin khách hàng. Nếu tin nhắn không đề cập rõ, trả về null cho trường đó.
2. KHÔNG tự tạo hoặc đoán số điện thoại. Chỉ lấy số điện thoại xuất hiện rõ ràng trong văn bản.
3. Phân loại intent chính xác vào 1 trong 10 giá trị:
   - BUY_LAND (muốn mua đất)
   - BUY_HOUSE (muốn mua nhà / căn hộ / biệt thự)
   - SELL_LAND (muốn bán đất)
   - SELL_HOUSE (muốn bán nhà / căn hộ)
   - RENT (muốn thuê bất động sản)
   - LEASE (muốn cho thuê bất động sản)
   - INVEST (khách đầu tư bất động sản)
   - PROJECT_INFO (khách hỏi thông tin dự án)
   - BROKER (khách là môi giới / cộng tác viên)
   - UNCLEAR (chưa rõ nhu cầu)
4. Quy đổi ngân sách về đơn vị VND dạng số nguyên (ví dụ "1 tỷ" -> 1000000000, "500 triệu" -> 500000000). Nếu khách nói "khoảng 1 tỷ", đặt budget_max = 1000000000, budget_min = null.
5. Tính lead_score từ 0 đến 100 dựa trên mức độ rõ ràng của nhu cầu, ngân sách, khu vực và có thông tin liên hệ.
6. Trả về summary và next_action ngắn gọn bằng Tiếng Việt chuyên nghiệp.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function analyzeWithGemini(text: string): Promise<Omit<RealEstateAiAnalysisResult, 'phones' | 'provider' | 'model'>> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Phân tích nội dung hội thoại khách hàng bất động sản sau đây:\n\n"""\n${text}\n"""`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          customer_name: { type: Type.STRING, nullable: true, description: 'Tên khách hàng nếu được cung cấp' },
          phone: { type: Type.STRING, nullable: true, description: 'Số điện thoại nếu có trong tin nhắn' },
          intent: {
            type: Type.STRING,
            enum: ['BUY_LAND', 'BUY_HOUSE', 'SELL_LAND', 'SELL_HOUSE', 'RENT', 'LEASE', 'INVEST', 'PROJECT_INFO', 'BROKER', 'UNCLEAR'],
          },
          property_type: {
            type: Type.STRING,
            nullable: true,
            enum: ['LAND', 'HOUSE', 'APARTMENT', 'VILLA', 'COMMERCIAL', 'OTHER'],
          },
          province: { type: Type.STRING, nullable: true },
          district: { type: Type.STRING, nullable: true },
          budget_min: { type: Type.NUMBER, nullable: true },
          budget_max: { type: Type.NUMBER, nullable: true },
          area_min: { type: Type.NUMBER, nullable: true },
          area_max: { type: Type.NUMBER, nullable: true },
          legal_requirement: { type: Type.STRING, nullable: true },
          lead_score: { type: Type.INTEGER },
          priority: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
          summary: { type: Type.STRING },
          next_action: { type: Type.STRING },
        },
        required: ['intent', 'lead_score', 'priority', 'summary', 'next_action'],
      },
    },
  });

  const rawJson = (response.text ?? '{}').trim();
  return JSON.parse(rawJson);
}

async function analyzeWithOpenAI(text: string): Promise<Omit<RealEstateAiAnalysisResult, 'phones' | 'provider' | 'model'>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY chưa được cấu hình khi chọn AI_PROVIDER=openai.');
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            SYSTEM_INSTRUCTION +
            '\nTrả về duy nhất JSON với các keys: customer_name, phone, intent, property_type, province, district, budget_min, budget_max, area_min, area_max, legal_requirement, lead_score, priority, summary, next_action.',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

export async function analyzeRealEstateConversation(
  text: string,
  preferredProvider?: 'gemini' | 'openai'
): Promise<RealEstateAiAnalysisResult> {
  if (!text || !text.trim()) {
    throw new Error('Nội dung cần phân tích không được để trống.');
  }

  const provider: 'gemini' | 'openai' =
    preferredProvider || (process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

  const phoneExtraction = extractVietnamesePhones(text);
  const parsed = provider === 'openai' ? await analyzeWithOpenAI(text) : await analyzeWithGemini(text);

  // Enforce deterministic phone truth: never trust hallucinated phone numbers
  const verifiedPhone = phoneExtraction.primaryPhone;
  const clampedScore = Math.max(0, Math.min(100, Math.round(Number(parsed.lead_score) || 0)));

  return {
    customer_name: parsed.customer_name || null,
    phone: verifiedPhone,
    phones: phoneExtraction.phones,
    intent: parsed.intent || 'UNCLEAR',
    property_type: parsed.property_type || null,
    province: parsed.province || null,
    district: parsed.district || null,
    budget_min: typeof parsed.budget_min === 'number' ? parsed.budget_min : null,
    budget_max: typeof parsed.budget_max === 'number' ? parsed.budget_max : null,
    area_min: typeof parsed.area_min === 'number' ? parsed.area_min : null,
    area_max: typeof parsed.area_max === 'number' ? parsed.area_max : null,
    legal_requirement: parsed.legal_requirement || null,
    lead_score: clampedScore,
    priority: parsed.priority || (clampedScore >= 75 ? 'HIGH' : clampedScore >= 45 ? 'MEDIUM' : 'LOW'),
    summary: parsed.summary || 'Chưa có tóm tắt phân tích.',
    next_action: parsed.next_action || 'Theo dõi thêm phản hồi của khách hàng.',
    provider,
    model: provider === 'openai' ? process.env.OPENAI_MODEL || 'gpt-4o-mini' : 'gemini-4-hydrogen',
  };
}
