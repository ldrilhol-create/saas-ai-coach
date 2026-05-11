'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Roadmap() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<any[]>([]);

  useEffect(() => {
    const generateRoadmap = async () => {
      try {
        const answers = JSON.parse(localStorage.getItem('quizAnswers') || '{}');

        const prompt = `Tu es un expert en entrepreneurship. L'utilisateur a répondu:
- Type de business: ${answers.businessType}
- Stade: ${answers.stage}
- Budget: ${answers.budget}
- Challenge: ${answers.challenge}
- Niche: ${answers.niche}

Génère un roadmap ultra concis avec 5 phases max. RÉPONDS UNIQUEMENT EN JSON:
{
  "title": "...",
  "phases": [
    {
      "phase": 1,
      "name": "...",
      "duration": "1-2 weeks",
      "tasks": [
        {"title": "...", "duration": "1 day"}
      ]
    }
  ]
}`;

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        const data = await response.json();
        const roadmapData = JSON.parse(data.roadmap);
        setRoadmap(roadmapData);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    generateRoadmap();
  }, []);

 const handleSendMessage = async () => {
  if (!message.trim()) return;

  const userMessage = message;
  setMessage('');
  setChat([...chat, { role: 'user', content: userMessage }]);

  const coachResponses = [
    "Excellente question! Pour réussir votre business digital, commencez par valider votre marché avec 20 prospects. C'est crucial avant de investir dans le produit.",
    "C'est une priorité clé. Je vous suggère de créer une landing page et de tester votre offre avec votre audience cible. Les données réelles valent de l'or!",
    "Bonne stratégie! Pour scaler, focalisez-vous sur l'acquisition client d'abord. Le produit peut attendre, les clients ne peuvent pas. Quelle est votre plus grande contrainte?",
    "Vous êtes sur la bonne voie! L'étape suivante est critique: validez que les clients paieront vraiment pour votre solution avant de développer.",
    "Parfait! Dans le business digital, le timing est tout. Avez-vous identifié votre customer avatar principal?"
  ];

  const randomResponse = coachResponses[Math.floor(Math.random() * coachResponses.length)];
  
  setTimeout(() => {
    setChat(prev => [...prev, { role: 'assistant', content: randomResponse }]);
  }, 800);
};
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Generating your roadmap...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold">Your Roadmap</h1>
          <button onClick={() => router.push('/')} className="border border-gray-600 px-4 py-2 rounded">Home</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">{roadmap?.title}</h2>
            <div className="space-y-6">
              {roadmap?.phases?.map((phase: any) => (
                <div key={phase.phase} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-bold text-lg">Phase {phase.phase}: {phase.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{phase.duration}</p>
                  {phase.tasks?.map((task: any, idx: number) => (
                    <div key={idx} className="flex gap-3 mb-2">
                      <input type="checkbox" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-gray-500">{task.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-fit">
          <h3 className="font-bold mb-4">AI Coach</h3>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {chat.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <span className={`inline-block px-3 py-2 rounded text-sm ${msg.role === 'user' ? 'bg-blue-500' : 'bg-gray-800'}`}>
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask..." className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm" />
            <button onClick={handleSendMessage} className="px-3 py-2 bg-blue-500 rounded">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}