import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, roadmap } = await request.json();

    const systemPrompt = `Tu es un coach entrepreneurship IA expert. L'utilisateur a ce roadmap:
${JSON.stringify(roadmap, null, 2)}

Réponds en français, sois concis et actionable. Max 150 words.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const responseText = response.choices[0].message.content || "";

    return Response.json({ response: responseText });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}