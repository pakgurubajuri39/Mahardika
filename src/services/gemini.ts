import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Quiz } from "../types";

export async function generateNarrative(playerName: string, character: string, location: string, event: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bertindaklah sebagai "Mahardika Game Engine". Berikan narasi singkat (1-2 kalimat) dengan gaya bahasa historis kolosal Nusantara untuk kejadian berikut:
      Pemain: ${playerName} (${character})
      Lokasi: ${location}
      Kejadian: ${event}`,
      config: {
        systemInstruction: "Gunakan gaya bahasa formal, puitis, dan kolosal seperti babad atau hikayat Nusantara kuno. Jangan gunakan markdown, berikan teks polos saja.",
      }
    });
    return response.text || "Angin berhembus membawa kabar dari kejauhan...";
  } catch (error) {
    console.error("Narrative generation failed:", error);
    return "Kejadian ini akan dicatat dalam sejarah.";
  }
}

export async function generateQuiz(): Promise<Quiz> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Berikan satu pertanyaan kuis sejarah Nusantara (Sriwijaya, Majapahit, atau sejarah kerajaan lainnya) beserta jawabannya.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Berikan 4 pilihan jawaban termasuk jawaban yang benar."
            }
          },
          required: ["question", "answer", "options"]
        }
      }
    });
    
    const quizData = JSON.parse(response.text || "{}");
    return quizData;
  } catch (error) {
    console.error("Quiz generation failed:", error);
    return {
      question: "Siapa raja yang membawa Majapahit ke puncak kejayaan?",
      answer: "Hayam Wuruk",
      options: ["Hayam Wuruk", "Raden Wijaya", "Gajah Mada", "Ken Arok"]
    };
  }
}

export async function generateHistoryInfo(location: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Berikan informasi sejarah atau budaya singkat (2-3 kalimat) tentang wilayah "${location}" dalam konteks sejarah Nusantara kuno. Gunakan gaya bahasa yang edukatif dan menarik.`,
      config: {
        systemInstruction: "Berikan teks polos saja tanpa markdown.",
      }
    });
    return response.text || "Informasi sejarah sedang dalam pencarian oleh para pujangga.";
  } catch (error) {
    console.error("History info generation failed:", error);
    return "Sejarah wilayah ini tersimpan rapat dalam prasasti kuno.";
  }
}

export async function generateVoice(text: string, character: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  // Map characters to prebuilt voices
  const voiceMap: Record<string, string> = {
    'Gajah Mada': 'Charon',
    'Laksamana Malahayati': 'Kore',
    'Tribhuwana Tunggadewi': 'Zephyr',
    'Sultan Baabullah': 'Puck'
  };

  const voiceName = voiceMap[character] || 'Fenrir';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      console.warn("TTS Quota exceeded. Audio skipped.");
    } else {
      console.error("TTS generation failed:", error);
    }
    return null;
  }
}
