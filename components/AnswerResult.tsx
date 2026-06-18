type Props = {
  yourAnswer?: string;
  correctAnswer?: string;
  score?: number;
};

export function AnswerResult({ yourAnswer, correctAnswer, score }: Props) {
  if (!correctAnswer) return null;

  if (!yourAnswer) {
    return (
      <div className="fc-phase-enter fc-card px-6 py-5 text-center">
        <p className="text-lg font-bold text-blue-800">No answer submitted</p>
      </div>
    );
  }

  const correct = yourAnswer === correctAnswer;

  if (correct) {
    return (
      <div className="fc-answer-correct rounded-2xl border-2 border-fc-correct bg-fc-correct-soft px-6 py-5 text-center shadow-lg">
        <p className="fc-confetti-icon text-4xl">✓</p>
        <p className="mt-2 text-2xl font-black text-fc-correct">Correct!</p>
        {score !== undefined && score > 0 && (
          <p className="mt-1 text-lg font-bold text-blue-900">
            +{score} points
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fc-answer-wrong rounded-2xl border-2 border-fc-wrong bg-fc-wrong-soft px-6 py-5 text-center shadow-lg">
      <p className="text-4xl font-black text-fc-wrong">✗</p>
      <p className="mt-2 text-2xl font-black text-fc-wrong">Wrong</p>
      <p className="mt-2 text-base font-semibold text-blue-900">
        You picked: <span className="font-black">{yourAnswer}</span>
      </p>
    </div>
  );
}
