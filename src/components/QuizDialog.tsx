import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz } from '../types';

interface QuizDialogProps {
  quiz: Quiz;
  onAnswer: (correct: boolean) => void;
}

const QuizDialog: React.FC<QuizDialogProps> = ({ quiz, onAnswer }) => {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [isRevealed, setIsRevealed] = React.useState(false);

  const handleSelect = (option: string) => {
    if (isRevealed) return;
    setSelected(option);
    setIsRevealed(true);
    setTimeout(() => {
      onAnswer(option === quiz.answer);
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-[#f5f2ed] border-4 border-stone-800 rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-stone-800" />
        
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-stone-500 mb-2">Tantangan Prasasti</h2>
        <h3 className="text-xl font-serif font-bold text-stone-800 mb-6 leading-relaxed">
          {quiz.question}
        </h3>

        <div className="grid gap-3">
          {quiz.options?.map((option, idx) => {
            const isCorrect = option === quiz.answer;
            const isSelected = option === selected;
            
            let bgColor = 'bg-white border-stone-200 hover:border-stone-800';
            if (isRevealed) {
              if (isCorrect) bgColor = 'bg-emerald-100 border-emerald-500 text-emerald-900';
              else if (isSelected) bgColor = 'bg-red-100 border-red-500 text-red-900';
              else bgColor = 'bg-white border-stone-200 opacity-50';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={isRevealed}
                className={`w-full p-4 text-left border-2 rounded-xl transition-all font-medium ${bgColor}`}
              >
                <span className="mr-3 opacity-50 font-mono">{String.fromCharCode(65 + idx)}.</span>
                {option}
              </button>
            );
          })}
        </div>

        {isRevealed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 text-center font-serif italic text-sm ${selected === quiz.answer ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {selected === quiz.answer ? 'Diplomasi berhasil! Subsidi kerajaan diberikan.' : 'Diplomasi gagal! Denda tambahan dikenakan.'}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default QuizDialog;
