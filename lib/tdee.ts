export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessProgram = 'lose_weight' | 'maintain' | 'build_muscle' | 'gain_weight';

export interface UserProfileData {
  weight: number;      // kg
  height: number;      // cm
  age: number;         // years
  gender: Gender;
  activityLevel: ActivityLevel;
  program: FitnessProgram;
}

export interface MacroTarget {
  calories: number;    // kcal
  protein: number;     // grams
  carbs: number;       // grams
  fat: number;         // grams
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculates BMR using the Mifflin-St Jeor equation.
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Calculates TDEE and recommends Calorie + Macro distributions based on fitness goals.
 */
export function calculateMacros(profile: UserProfileData): MacroTarget {
  const { weight, height, age, gender, activityLevel, program } = profile;
  
  // Calculate BMR
  const bmr = calculateBMR(weight, height, age, gender);
  
  // Calculate TDEE
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  const tdee = bmr * multiplier;
  
  let targetCalories = Math.round(tdee);
  let proteinPercent = 0.30;
  let carbsPercent = 0.40;
  let fatPercent = 0.30;
  
  switch (program) {
    case 'lose_weight':
      // Calorie deficit (TDEE - 500 kcal)
      targetCalories = Math.max(1200, Math.round(tdee - 500)); // Don't drop below 1200 kcal for safety
      // High-protein deficit to preserve muscle mass
      proteinPercent = 0.40;
      carbsPercent = 0.35;
      fatPercent = 0.25;
      break;

    case 'maintain':
      // No calorie adjustment — stay at TDEE
      targetCalories = Math.round(tdee);
      // Balanced macros for body composition maintenance
      proteinPercent = 0.30;
      carbsPercent = 0.40;
      fatPercent = 0.30;
      break;

    case 'gain_weight':
      // Calorie surplus (TDEE + 500 kcal)
      targetCalories = Math.round(tdee + 500);
      // High-carb surplus to facilitate weight/glycogen gain
      proteinPercent = 0.25;
      carbsPercent = 0.50;
      fatPercent = 0.25;
      break;
      
    case 'build_muscle':
      // Mild calorie surplus (TDEE + 300 kcal) for lean gain
      targetCalories = Math.round(tdee + 300);
      // Very high protein ratio for protein synthesis
      proteinPercent = 0.35;
      carbsPercent = 0.45;
      fatPercent = 0.20;
      break;
  }
  
  // Calculate macro grams (Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g)
  const proteinGrams = Math.round((targetCalories * proteinPercent) / 4);
  const carbsGrams = Math.round((targetCalories * carbsPercent) / 4);
  const fatGrams = Math.round((targetCalories * fatPercent) / 9);
  
  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams,
  };
}
