import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateAIImages() {
  console.log("Generating AI Image 1...");
  const response1 = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: 'A high-quality, cinematic wide shot of a beautiful Islamic Iftar Mahfil gathering at dusk. Long tables decorated with traditional food, dates, and water. Warm glowing lanterns (fanous) hanging. A majestic mosque with minarets in the background under a starry twilight sky. Elegant, festive, and peaceful atmosphere. 4K resolution, highly detailed.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      },
    },
  });

  let imageUrl1 = "";
  for (const part of response1.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl1 = `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  console.log("Generating AI Image 2...");
  const response2 = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: 'A cinematic shot of a group of young Bangladeshi friends (SSC Batch 2019) sitting together at an Iftar table in a decorated school courtyard. They are smiling and sharing food. Warm lighting from string lights and lanterns. Festive Islamic decorations. High quality, realistic, emotional, and vibrant. 4K resolution.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      },
    },
  });

  let imageUrl2 = "";
  for (const part of response2.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl2 = `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  console.log("AI_IMAGE_1=" + imageUrl1.substring(0, 100) + "...");
  console.log("AI_IMAGE_2=" + imageUrl2.substring(0, 100) + "...");
  
  // Since I can't easily pass these back to the main app via env vars in a single turn without a server,
  // I will just use these base64 strings directly in the code if they are not too long, 
  // or I will just use the prompt to generate them in the app itself if I were building a dynamic generator.
  // But here I'll just hardcode them or use a placeholder if they are too big.
  // Actually, I'll just use the prompts in the app's initialization if no images are found.
}

// generateAIImages();
