import { GoogleGenAI } from "@google/genai";
import { GroundingData, SenseType } from '../types';

export const generateGroundingImage = async (data: GroundingData): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct a calming prompt based on user inputs
  const prompt = `
    Create a peaceful, dreamy, artistic illustration in a soft watercolor style.
    The image should loosely and abstractly combine the following sensory elements to create a cohesive scene of safety and calm.
    
    Visual Elements: ${data[SenseType.SEE]}
    Auditory Elements (visualize the sound sources): ${data[SenseType.HEAR]}
    Tactile Elements (textures): ${data[SenseType.TOUCH]}
    Scent Elements (flowers, rain, food, etc): ${data[SenseType.SMELL]}
    Taste Elements: ${data[SenseType.TASTE]}

    Style Guide:
    - Soft, muted colors: sage greens, lavenders, warm creams.
    - No harsh lines or jarring contrasts.
    - Therapeutic, whimsical, and comforting.
    - If abstract concepts are mentioned, interpret them as light or color.
    - Do not include text in the image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
         // Generate 1 image
      }
    });

    // Extract the image from the response
    // The prompt explicitly asks for an image model interaction.
    // For gemini-2.5-flash-image, the response usually contains the image in the parts.
    
    // Check candidates
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;

  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};