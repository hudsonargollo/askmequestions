import { useState } from 'react';
import { X, Star, MessageSquare, Image as ImageIcon, Zap, Shield } from 'lucide-react';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId?: string;
  imageUrl?: string;
  onSubmit: (feedback: UserFeedback) => void;
}

interface UserFeedback {
  imageId?: string;
  imageQuality: number; // 1-5 stars
  systemUsability: number; // 1-5 stars
  generationSpeed: number; // 1-5 stars
  overallSatisfaction: number; // 1-5 stars
  specificFeedback: {
    visualConsistency: boolean;
    brandAccuracy: boolean;
    technicalQuality: boolean;
    promptAccuracy: boolean;
  };
  comments: string;
  wouldRecommend: boolean;
  improvementSuggestions: string;
}

export default function UserFeedbackModal({ 
  isOpen, 
  onClose, 
  imageId, 
  imageUrl, 
  onSubmit 
}: UserFeedbackModalProps) {
  const [feedback, setFeedback] = useState<UserFeedback>({
    imageId,
    imageQuality: 0,
    systemUsability: 0,
    generationSpeed: 0,
    overallSatisfaction: 0,
    specificFeedback: {
      visualConsistency: false,
      brandAccuracy: false,
      technicalQuality: false,
      promptAccuracy: false
    },
    comments: '',
    wouldRecommend: false,
    improvementSuggestions: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  if (!isOpen) return null;

  const handleRatingChange = (category: keyof Pick<UserFeedback, 'imageQuality' | 'systemUsability' | 'generationSpeed' | 'overallSatisfaction'>, rating: number) => {
    setFeedback(prev => ({
      ...prev,
      [category]: rating
    }));
  };

  const handleSpecificFeedbackChange = (aspect: keyof UserFeedback['specificFeedback'], checked: boolean) => {
    setFeedback(prev => ({
      ...prev,
      specificFeedback: {
        ...prev.specificFeedback,
        [aspect]: checked
      }
    }));
  };

  const handleSubmit = () => {
    onSubmit(feedback);
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return feedback.imageQuality > 0 && feedback.systemUsability > 0;
      case 2:
        return feedback.generationSpeed > 0 && feedback.overallSatisfaction > 0;
      case 3:
        return true; // Optional step
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    label 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void; 
    label: string;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-200 mb-2">
        {label}
      </label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`p-1 transition-colors ${
              star <= rating
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-gray-600 hover:text-gray-500'
            }`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {rating === 0 && 'Click to rate'}
        {rating === 1 && 'Poor'}
        {rating === 2 && 'Fair'}
        {rating === 3 && 'Good'}
        {rating === 4 && 'Very Good'}
        {rating === 5 && 'Excellent'}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">User Feedback</h2>
            <p className="text-sm text-gray-400">
              Help us improve the Capitão Caverna Image Engine
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-400">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Basic Ratings */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                Image Quality & System Usability
              </h3>
              
              {imageUrl && (
                <div className="mb-6">
                  <img 
                    src={imageUrl} 
                    alt="Generated image" 
                    className="w-full max-w-sm mx-auto rounded-lg border border-gray-600"
                  />
                </div>
              )}

              <StarRating
                rating={feedback.imageQuality}
                onRatingChange={(rating) => handleRatingChange('imageQuality', rating)}
                label="How would you rate the quality of the generated image?"
              />

              <StarRating
                rating={feedback.systemUsability}
                onRatingChange={(rating) => handleRatingChange('systemUsability', rating)}
                label="How easy was it to use the image generation interface?"
              />
            </div>
          )}

          {/* Step 2: Performance & Satisfaction */}
          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Performance & Overall Experience
              </h3>

              <StarRating
                rating={feedback.generationSpeed}
                onRatingChange={(rating) => handleRatingChange('generationSpeed', rating)}
                label="How satisfied are you with the generation speed?"
              />

              <StarRating
                rating={feedback.overallSatisfaction}
                onRatingChange={(rating) => handleRatingChange('overallSatisfaction', rating)}
                label="Overall, how satisfied are you with the system?"
              />

              <div className="mt-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={feedback.wouldRecommend}
                    onChange={(e) => setFeedback(prev => ({ ...prev, wouldRecommend: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-200">I would recommend this system to others</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Specific Feedback */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Specific Quality Aspects
              </h3>
              
              <p className="text-gray-400 mb-4">
                Please check all aspects that met your expectations:
              </p>

              <div className="space-y-3">
                {[
                  { key: 'visualConsistency', label: 'Visual consistency with Capitão Caverna brand' },
                  { key: 'brandAccuracy', label: 'Brand accuracy (colors, proportions, style)' },
                  { key: 'technicalQuality', label: 'Technical quality (resolution, clarity, details)' },
                  { key: 'promptAccuracy', label: 'Accuracy to selected parameters (pose, outfit, etc.)' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={feedback.specificFeedback[key as keyof UserFeedback['specificFeedback']]}
                      onChange={(e) => handleSpecificFeedbackChange(key as keyof UserFeedback['specificFeedback'], e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-200">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Comments & Suggestions */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Additional Comments & Suggestions
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Additional comments about your experience:
                </label>
                <textarea
                  value={feedback.comments}
                  onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about your experience, any issues you encountered, or what you liked most..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Suggestions for improvement:
                </label>
                <textarea
                  value={feedback.improvementSuggestions}
                  onChange={(e) => setFeedback(prev => ({ ...prev, improvementSuggestions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What features would you like to see added or improved?"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentStep === 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  canProceed()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Submit Feedback
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}