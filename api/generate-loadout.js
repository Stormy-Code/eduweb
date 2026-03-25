/**
 * Vercel serverless function for secure loadout generation.
 * Keeps GEMINI_API_KEY on the server and never exposes it to the browser.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw);
}

function validateLoadout(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.categories) || !Array.isArray(data.tips)) return false;
  return Boolean(data.title && data.description && data.totalWeight);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Nedostaje konfiguracija: GEMINI_API_KEY nije postavljen na serveru.',
    });
  }

  try {
    const prompt = (req.body?.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt je obavezan.' });
    }

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text:
                'Ti si vrhunski stručnjak za outdoor, bushcraft i preživljavanje. ' +
                'Odgovaraj isključivo na hrvatskom jeziku i vrati samo valjani JSON objekt.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `Korisnik traži opremu za sljedeću situaciju: "${prompt}". ` +
                  'Generiraj premium, visoko optimiziran popis opreme (loadout) za outdoor, bushcraft, preživljavanje ili EDC. ' +
                  'Budi vrlo specifičan oko modela opreme i pazi na realistične težine. ' +
                  'Vrati JSON s poljima: ' +
                  'title (string), description (string), totalWeight (string), ' +
                  'categories (array: {name, items[]}), items: {name, description, weight, importance}, ' +
                  'tips (array od 3-5 stringova).',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const apiMessage =
        payload?.error?.message ||
        'Gemini API je vratio pogrešku.';
      return res.status(response.status).json({ error: apiMessage });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Prazan odgovor od AI servisa.' });
    }

    let loadout;
    try {
      loadout = extractJson(text);
    } catch {
      return res.status(502).json({ error: 'AI je vratio neispravan JSON format.' });
    }

    if (!validateLoadout(loadout)) {
      return res.status(502).json({ error: 'AI odgovor nema očekivanu strukturu.' });
    }

    return res.status(200).json({ loadout });
  } catch (error) {
    return res.status(500).json({
      error: `Neočekivana greška servera: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

