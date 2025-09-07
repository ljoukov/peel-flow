// Minimal Gemini REST client for React Native / Expo (no Node-only deps)

export type GenerateParams = {
  prompt: string;
  model?: string;
  apiKey?: string; // optional override, otherwise use hard-coded key
};

// Use Gemini 2.5 image-preview model per provided snippet
const DEFAULT_MODEL = 'gemini-2.5-flash-image-preview';

// Read the API key from Expo environment variables.
// Note: EXPO_PUBLIC_* vars are embedded in the client bundle and are not secret.
// For true secrecy, proxy requests through an API route and read an unprefixed secret there.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export type GenerateResult = {
  text: string;
  images: {
    mimeType: string;
    data: string; // base64
  }[];
  debugParts?: string; // JSON summary of parts, trimmed
};

export async function generateContent({
  prompt,
  model,
  apiKey,
}: GenerateParams): Promise<GenerateResult> {
  const key = apiKey || GEMINI_API_KEY;
  const targetModel = model || DEFAULT_MODEL;

  if (!key) {
    // No public key available on the client: use server proxy route.
    const res = await fetch('/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: targetModel }),
    });
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(text || `Gemini proxy request failed (${res.status})`);
    }
    const payload = (await res.json()) as GenerateResult | { error?: string };
    if ((payload as any).error) {
      throw new Error((payload as any).error);
    }
    return payload as GenerateResult;
  }

  // Direct call from client if a public key is provided (not secret).
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    targetModel
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseModalities: ['IMAGE', 'TEXT'],
        response_modalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Gemini request failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as any;

  const result: GenerateResult = {
    text: '',
    images: [],
  };

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  try {
    const summary = parts.map((p: any, i: number) => {
      if (p?.text != null) {
        const t = String(p.text);
        return { idx: i, type: 'text', len: t.length, preview: t.slice(0, 120) };
      }
      if (p?.inlineData != null) {
        const mt = p.inlineData?.mimeType;
        const d = String(p.inlineData?.data || '');
        return { idx: i, type: 'inlineData', mimeType: mt, size: d.length, preview: d.slice(0, 40) };
      }
      const keys = Object.keys(p || {});
      return { idx: i, type: 'other', keys };
    });
    let json = JSON.stringify(summary);
    if (json.length > 200) json = json.slice(0, 200) + '…';
    result.debugParts = json;
  } catch {}
  for (const part of parts) {
    if (part.text) {
      result.text += part.text;
    } else if (part.inlineData) {
      result.images.push({
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data,
      });
    }
  }
  result.text = result.text.trim();
  return result;
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
