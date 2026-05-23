import { GoogleGenAI } from '@google/genai';

export interface FoodAnalysisResult {
  foodName: string;
  foodNameTh: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface FoodLog {
  id?: string;
  foodName: string;
  foodNameTh: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  confirmed: boolean;
  imageUrl?: string;
  date: string;
  createdAt: Date;
  updatedAt?: Date;
  baseCalories?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFat?: number;
}

const mockFoods: Omit<FoodAnalysisResult, 'mealType'>[] = [
  { foodName: 'Stir-fried Basil with Pork', foodNameTh: 'ข้าวกะเพราหมูสับ', calories: 620, protein: 22, carbs: 75, fat: 26, portionSize: '1 จาน (350 กรัม)' },
  { foodName: 'Hainanese Chicken Rice', foodNameTh: 'ข้าวมันไก่', calories: 650, protein: 24, carbs: 80, fat: 28, portionSize: '1 จาน (380 กรัม)' },
  { foodName: 'Pad Thai with Shrimp', foodNameTh: 'ผัดไทยกุ้งสด', calories: 580, protein: 18, carbs: 85, fat: 20, portionSize: '1 จาน (300 กรัม)' },
  { foodName: 'Papaya Salad with Grilled Chicken', foodNameTh: 'ส้มตำไก่ย่าง', calories: 350, protein: 28, carbs: 25, fat: 12, portionSize: 'ส้มตำ 1 จาน + ไก่ย่าง 1 ชิ้น' },
  { foodName: 'Tom Yum Goong', foodNameTh: 'ต้มยำกุ้งน้ำข้น', calories: 290, protein: 18, carbs: 12, fat: 18, portionSize: '1 ถ้วย (300 มล.)' },
];

/**
 * Analyzes an image of food using Gemini Vision AI.
 * If API Key is missing or request fails, falls back to a mock analysis for smooth development.
 */
export async function analyzeFoodImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<FoodAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key') {
    console.warn('Gemini API Key is not set or using placeholder. Returning mock food analysis.');
    return getMockAnalysis();
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64Image = imageBuffer.toString('base64');

    const prompt = `Analyze this food image. Provide an accurate estimation of the dish name (both English and Thai), estimated calories in kcal, and macronutrients (protein, carbs, and fat in grams). Estimate the portion size and categorize the meal type based on typical times or food contents. Always return a valid JSON object matching the requested schema.`;

    const schema = {
      type: 'OBJECT',
      properties: {
        foodName: { type: 'STRING', description: 'Name of the food in English (e.g. Pad Thai)' },
        foodNameTh: { type: 'STRING', description: 'Name of the food in Thai (e.g. ผัดไทยกุ้งสด)' },
        calories: { type: 'INTEGER', description: 'Estimated calories in kcal' },
        protein: { type: 'INTEGER', description: 'Estimated protein in grams' },
        carbs: { type: 'INTEGER', description: 'Estimated carbohydrates in grams' },
        fat: { type: 'INTEGER', description: 'Estimated fat in grams' },
        portionSize: { type: 'STRING', description: 'Portion description in Thai (e.g. 1 จาน, 1 ถ้วย, 300 กรัม)' },
        mealType: { 
          type: 'STRING', 
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'Best fit meal category'
        }
      },
      required: ['foodName', 'foodNameTh', 'calories', 'protein', 'carbs', 'fat', 'portionSize', 'mealType']
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response text from Gemini');
    }

    const data = JSON.parse(text) as FoodAnalysisResult;
    return data;
  } catch (error) {
    console.error('Error analyzing food image with Gemini:', error);
    console.warn('Falling back to mock food analysis due to API error.');
    return getMockAnalysis();
  }
}

/**
 * Analyzes a text description of food using Gemini text AI.
 * Returns calories=0 when the input does not appear to be a food description.
 */
export async function analyzeFoodText(
  foodDescription: string
): Promise<FoodAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key') {
    console.warn('Gemini API Key is not set. Using mock food analysis for text input.');
    return getMockAnalysis();
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `The user typed: "${foodDescription}"

If this looks like a food/drink description (in any language, especially Thai or English), estimate the nutritional values. Account for any quantity mentioned (e.g. "2 bowls", "1 plate", "200g").

If this is clearly NOT food (e.g. a greeting, random words, or a question), return calories=0 and foodName="not_food".

Return JSON only.`;

    const schema = {
      type: 'OBJECT',
      properties: {
        foodName: { type: 'STRING', description: 'Food name in English. Use "not_food" if input is not a food description.' },
        foodNameTh: { type: 'STRING', description: 'Food name in Thai.' },
        calories: { type: 'INTEGER', description: 'Estimated total calories in kcal. Return 0 if not food.' },
        protein: { type: 'INTEGER', description: 'Estimated protein in grams.' },
        carbs: { type: 'INTEGER', description: 'Estimated carbohydrates in grams.' },
        fat: { type: 'INTEGER', description: 'Estimated fat in grams.' },
        portionSize: { type: 'STRING', description: 'Portion description in Thai (e.g. 1 จาน, 1 ถ้วย).' },
        mealType: {
          type: 'STRING',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'Best-fit meal category based on the food type and time context.',
        },
      },
      required: ['foodName', 'foodNameTh', 'calories', 'protein', 'carbs', 'fat', 'portionSize', 'mealType'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');

    const data = JSON.parse(text) as FoodAnalysisResult;
    return data;
  } catch (error) {
    console.error('Error analyzing food text with Gemini:', error);
    return getMockAnalysis();
  }
}

/**
 * Returns a randomized mock food analysis result for local testing/fallback.
 */
function getMockAnalysis(): FoodAnalysisResult {
  const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)];
  const currentHour = new Date().getHours();
  
  let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'snack';
  if (currentHour >= 5 && currentHour < 11) {
    mealType = 'breakfast';
  } else if (currentHour >= 11 && currentHour < 16) {
    mealType = 'lunch';
  } else if (currentHour >= 16 && currentHour < 22) {
    mealType = 'dinner';
  }

  return {
    ...randomFood,
    mealType,
  };
}
