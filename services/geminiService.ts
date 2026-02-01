import { GoogleGenAI } from "@google/genai";
import { LungMetrics, ViewMode } from "../types";

// Note: In a real app, strict error handling for missing keys is needed.
// Here we assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeLungProgression = async (
  currentMetrics: LungMetrics,
  baselineMetrics: LungMetrics,
  mode: ViewMode
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not configured. Unable to generate AI insights.";
  }

  const modelId = "gemini-3-flash-preview";
  
  const systemInstruction = mode === ViewMode.DOCTOR
    ? "You are a specialized medical AI assistant for pulmonologists. Analyze the provided longitudinal lung function metrics. Focus on structural changes, stiffness progression, and lobar volume loss. Use medical terminology (e.g., 'parenchymal compliance', 'fibrotic progression'). Be concise, data-driven, and objective. DO NOT provide a diagnosis. Limit to 3 bullet points."
    : "You are a helpful medical assistant explaining lung health changes to a patient. Use simple, reassuring, and clear language. Avoid complex jargon. Explain what the changes in volume and stiffness mean for their breathing. Focus on how the lungs are moving. DO NOT provide a medical diagnosis. Limit to 3 short paragraphs.";

  const prompt = `
    Compare the following lung metrics:
    
    Baseline:
    - Total Volume: ${baselineMetrics.totalVolume} mL
    - Stiffness Index: ${baselineMetrics.stiffnessIndex}
    - Expansion Ratio: ${baselineMetrics.expansionRatio}
    - Air Trapping: ${baselineMetrics.airTrapping}%

    Current (Year 2):
    - Total Volume: ${currentMetrics.totalVolume} mL
    - Stiffness Index: ${currentMetrics.stiffnessIndex}
    - Expansion Ratio: ${currentMetrics.expansionRatio}
    - Air Trapping: ${currentMetrics.airTrapping}%

    Provide an assessment of the progression.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, 
      },
    });
    
    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate analysis at this time.";
  }
};

export const getSimilarCasesAnalysis = async (condition: string): Promise<string> => {
   if (!process.env.API_KEY) return "API Key missing.";
   
   const prompt = `Briefly describe the typical progression pattern for ${condition} over 2 years in 2 sentences.`;
   try {
     const response = await ai.models.generateContent({
       model: "gemini-3-flash-preview",
       contents: prompt
     });
     return response.text || "";
   } catch (e) {
     return "";
   }
}
