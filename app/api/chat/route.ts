import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message, roadmap } = await request.json();

    const systemPrompt = `Tu es un coach business digital EXPERT et passionné. Tu accompagnes des entrepreneurs de l'idée au scaling.

ROADMAP DE L'UTILISATEUR:
${JSON.stringify(roadmap, null, 2)}

INSTRUCTIONS:
- Donne des conseils ACTIONNABLES et CONCRETS
- Sois ENTHOUSIASTE et MOTIVANT
- Adapte tes réponses au roadmap et à la phase actuelle
- Pose des questions pour comprendre les blocages
- Donne des examples réels du business digital
- Max 200 words, sois CONCIS
- Réponds en FRANÇAIS`;

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
      { response: "Erreur de connexion. Réessayez!" },
      { status: 500 }
    );
  }
}