// API Route: Proxies Gemini requests server-side so the API key stays secret.
// Reads the unprefixed `GEMINI_API_KEY` from environment variables (Expo Dashboard or host env).

type Body = {
  prompt?: string;
  model?: string;
};

const DEFAULT_MODEL = 'gemini-2.5-flash-image-preview';

export async function POST(request: Request) {
  try {
    const { prompt, model }: Body = await request.json().catch(() => ({}));
    if (!prompt || typeof prompt !== 'string') {
      return json({ error: 'Missing required field: prompt' }, 400);
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return json(
        {
          error:
            'Missing GEMINI_API_KEY. Set it in the Expo Dashboard or host environment for server routes.',
        },
        500
      );
    }

    const targetModel = model || DEFAULT_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      targetModel
    )}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      return json({ error: `Gemini request failed (${res.status}): ${text || res.statusText}` }, res.status);
    }

    const data = (await res.json()) as any;
    const parts = data?.candidates?.[0]?.content?.parts ?? [];

    const result = {
      text: '',
      images: [] as { mimeType: string; data: string }[],
      debugParts: undefined as string | undefined,
    };

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
      let jsonStr = JSON.stringify(summary);
      if (jsonStr.length > 200) jsonStr = jsonStr.slice(0, 200) + '…';
      result.debugParts = jsonStr;
    } catch {}

    for (const part of parts) {
      if (part?.text) {
        result.text += part.text;
      } else if (part?.inlineData) {
        result.images.push({ mimeType: part.inlineData.mimeType, data: part.inlineData.data });
      }
    }
    result.text = result.text.trim();

    return Response.json(result);
  } catch (e: any) {
    return json({ error: e?.message || 'Unhandled server error' }, 500);
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

