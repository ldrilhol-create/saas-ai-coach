'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Quiz() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    businessType: '',
    stage: '',
    budget: '',
    challenge: '',
    niche: '',
  });

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // Save to localStorage
    localStorage.setItem('quizAnswers', JSON.stringify(answers));
    router.push('/roadmap');
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            <span className="text-sm text-gray-400">Question {step} of 5</span>
            <span className="text-sm text-gray-400">{Math.round((step / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">What type of business?</h2>
              <div className="space-y-3">
                {['Ecommerce', 'Digital Products', 'Service-based', 'SaaS', 'Other'].map(type => (
                  <button
                    key={type}
                    onClick={() => setAnswers({ ...answers, businessType: type })}
                    className={`w-full p-4 border rounded-lg text-left transition ${
                      answers.businessType === type
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">What stage are you at?</h2>
              <div className="space-y-3">
                {['Idea', 'MVP', 'First customers', '10k/month', 'Scaling'].map(s => (
                  <button
                    key={s}
                    onClick={() => setAnswers({ ...answers, stage: s })}
                    className={`w-full p-4 border rounded-lg text-left transition ${
                      answers.stage === s
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Budget?</h2>
              <div className="space-y-3">
                {['$0', '$1-100', '$100-500', '$500-2k', '$2k+'].map(budget => (
                  <button
                    key={budget}
                    onClick={() => setAnswers({ ...answers, budget })}
                    className={`w-full p-4 border rounded-lg text-left transition ${
                      answers.budget === budget
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {budget}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Biggest challenge?</h2>
              <textarea
                value={answers.challenge}
                onChange={(e) => setAnswers({ ...answers, challenge: e.target.value })}
                placeholder="Type here..."
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 min-h-32"
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Target niche?</h2>
              <textarea
                value={answers.niche}
                onChange={(e) => setAnswers({ ...answers, niche: e.target.value })}
                placeholder="e.g., Busy entrepreneurs, fitness enthusiasts..."
                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 min-h-32"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="flex-1 py-2 border border-gray-700 rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            Previous
          </button>
          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 font-bold"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 bg-green-500 rounded-lg hover:bg-green-600 font-bold"
            >
              Generate Roadmap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}