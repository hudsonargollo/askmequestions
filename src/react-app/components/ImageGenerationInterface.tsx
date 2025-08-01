import { useState, useEffect, useMemo } from 'react';
import {
  ImageGenerationParams,
  PromptOptions,
  ValidationResult,
  PoseDefinition,
  OutfitDefinition,
  FootwearDefinition,
  PropDefinition,
  FrameDefinition,
} from '@/shared/types';
import { 
  User, 
  Shirt, 
  Footprints, 
  Package, 
  Film, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Eye,
  Settings
} from 'lucide-react';

interface ImageGenerationInterfaceProps {
  onGenerate: (params: ImageGenerationParams) => void;
  isGenerating?: boolean;
}

export default function ImageGenerationInterface({ 
  onGenerate, 
  isGenerating = false 
}: ImageGenerationInterfaceProps) {
  
  // State for selected parameters
  const [selectedParams, setSelectedParams] = useState<Partial<ImageGenerationParams>>({
    frameType: 'standard',
  });
  
  // State for available options
  const [availableOptions, setAvailableOptions] = useState<PromptOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for validation
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // State for UI
  const [activeTab, setActiveTab] = useState<'pose' | 'outfit' | 'footwear' | 'props' | 'frames'>('pose');

  // Load available options on component mount
  useEffect(() => {
    loadAvailableOptions();
  }, []);

  // Validate parameters whenever they change
  useEffect(() => {
    if (selectedParams.pose && selectedParams.outfit && selectedParams.footwear) {
      validateCurrentSelection();
    }
  }, [selectedParams]);

  const loadAvailableOptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/images/options');
      if (!response.ok) {
        throw new Error('Failed to load options');
      }
      const options: PromptOptions = await response.json();
      setAvailableOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentSelection = async () => {
    if (!selectedParams.pose || !selectedParams.outfit || !selectedParams.footwear) {
      return;
    }

    try {
      const response = await fetch('/api/v1/images/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ params: selectedParams }),
      });
      
      if (!response.ok) {
        throw new Error('Validation failed');
      }
      
      const result: ValidationResult = await response.json();
      setValidation(result);
    } catch (err) {
      console.error('Validation error:', err);
    }
  };

  // Get compatible options based on current selections
  const compatibleOptions = useMemo(() => {
    if (!availableOptions) return null;

    const compatible: Partial<PromptOptions> = {
      poses: availableOptions.poses,
      outfits: availableOptions.outfits,
      footwear: availableOptions.footwear,
      props: availableOptions.props,
      frames: availableOptions.frames,
    };

    // Filter outfits based on selected pose
    if (selectedParams.pose) {
      const selectedPose = availableOptions.poses.find(p => p.id === selectedParams.pose);
      if (selectedPose) {
        compatible.outfits = availableOptions.outfits.filter(
          outfit => selectedPose.compatibleOutfits.includes(outfit.id)
        );
      }
    }

    // Filter footwear based on selected outfit
    if (selectedParams.outfit) {
      const selectedOutfit = availableOptions.outfits.find(o => o.id === selectedParams.outfit);
      if (selectedOutfit) {
        compatible.footwear = availableOptions.footwear.filter(
          footwear => selectedOutfit.compatibleFootwear.includes(footwear.id)
        );
      }
    }

    // Filter props based on selected pose
    if (selectedParams.pose) {
      const selectedPose = availableOptions.poses.find(p => p.id === selectedParams.pose);
      if (selectedPose) {
        compatible.props = availableOptions.props.filter(
          prop => prop.compatiblePoses.includes(selectedPose.id)
        );
      }
    }

    // Filter frames based on frame type
    if (selectedParams.frameType) {
      compatible.frames = availableOptions.frames.filter(frame => {
        if (selectedParams.frameType === 'onboarding') {
          return frame.sequence.includes('onboarding');
        }
        if (selectedParams.frameType === 'sequence') {
          return frame.sequence.includes('sequence');
        }
        return true;
      });
    }

    return compatible;
  }, [availableOptions, selectedParams]);

  const handleParameterChange = (key: keyof ImageGenerationParams, value: string) => {
    setSelectedParams(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFrameTypeChange = (frameType: 'standard' | 'onboarding' | 'sequence') => {
    setSelectedParams(prev => ({
      ...prev,
      frameType,
      frameId: undefined, // Reset frame selection when type changes
    }));
  };

  const handleGenerate = () => {
    if (!selectedParams.pose || !selectedParams.outfit || !selectedParams.footwear) {
      return;
    }

    const params: ImageGenerationParams = {
      pose: selectedParams.pose,
      outfit: selectedParams.outfit,
      footwear: selectedParams.footwear,
      prop: selectedParams.prop,
      frameType: selectedParams.frameType,
      frameId: selectedParams.frameId,
    };

    onGenerate(params);
  };

  const isGenerateDisabled = () => {
    return (
      !selectedParams.pose ||
      !selectedParams.outfit ||
      !selectedParams.footwear ||
      (validation && !validation.isValid) ||
      isGenerating
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-300">Loading options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-200">{error}</span>
        </div>
      </div>
    );
  }

  if (!availableOptions || !compatibleOptions) {
    return (
      <div className="text-center p-8 text-gray-400">
        No options available
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white/10 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Generate Capitão Caverna Image
        </h2>
        <p className="text-gray-300">
          Select pose, outfit, footwear, and optional props to generate a custom image
        </p>
      </div>

      {/* Frame Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Frame Type
        </label>
        <div className="flex space-x-4">
          {(['standard', 'onboarding', 'sequence'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFrameTypeChange(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedParams.frameType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-600 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'pose', label: 'Pose', icon: User, required: true },
            { id: 'outfit', label: 'Outfit', icon: Shirt, required: true },
            { id: 'footwear', label: 'Footwear', icon: Footprints, required: true },
            { id: 'props', label: 'Props', icon: Package, required: false },
            { id: 'frames', label: 'Frames', icon: Film, required: false },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            const hasSelection = selectedParams[tab.id as keyof ImageGenerationParams];
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  isSelected
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.required && (
                  <span className="text-red-500 text-xs">*</span>
                )}
                {hasSelection && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === 'pose' && (
          <PoseSelection
            poses={compatibleOptions.poses || []}
            selectedPose={selectedParams.pose}
            onSelect={(pose) => handleParameterChange('pose', pose)}
          />
        )}

        {activeTab === 'outfit' && (
          <OutfitSelection
            outfits={compatibleOptions.outfits || []}
            selectedOutfit={selectedParams.outfit}
            onSelect={(outfit) => handleParameterChange('outfit', outfit)}
            disabled={!selectedParams.pose}
          />
        )}

        {activeTab === 'footwear' && (
          <FootwearSelection
            footwear={compatibleOptions.footwear || []}
            selectedFootwear={selectedParams.footwear}
            onSelect={(footwear) => handleParameterChange('footwear', footwear)}
            disabled={!selectedParams.outfit}
          />
        )}

        {activeTab === 'props' && (
          <PropSelection
            props={compatibleOptions.props || []}
            selectedProp={selectedParams.prop}
            onSelect={(prop) => handleParameterChange('prop', prop)}
            disabled={!selectedParams.pose}
          />
        )}

        {activeTab === 'frames' && (
          <FrameSelection
            frames={compatibleOptions.frames || []}
            selectedFrame={selectedParams.frameId}
            onSelect={(frame) => handleParameterChange('frameId', frame)}
            frameType={selectedParams.frameType}
            disabled={selectedParams.frameType === 'standard'}
          />
        )}
      </div>

      {/* Validation Results */}
      {validation && (
        <ValidationDisplay validation={validation} />
      )}

      {/* Preview Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
        >
          <Eye className="h-4 w-4" />
          <span>{showPreview ? 'Hide' : 'Show'} Selection Preview</span>
        </button>
      </div>

      {/* Selection Preview */}
      {showPreview && (
        <SelectionPreview selectedParams={selectedParams} />
      )}

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerateDisabled()}
          className={`px-6 py-3 rounded-md font-medium flex items-center space-x-2 ${
            isGenerateDisabled()
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{isGenerating ? 'Generating...' : 'Generate Image'}</span>
        </button>
      </div>
    </div>
  );
}

// Pose Selection Component
function PoseSelection({ 
  poses, 
  selectedPose, 
  onSelect 
}: {
  poses: PoseDefinition[];
  selectedPose?: string;
  onSelect: (pose: string) => void;
}) {
  const groupedPoses = poses.reduce((acc, pose) => {
    if (!acc[pose.category]) {
      acc[pose.category] = [];
    }
    acc[pose.category].push(pose);
    return acc;
  }, {} as Record<string, PoseDefinition[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedPoses).map(([category, categoryPoses]) => (
        <div key={category}>
          <h3 className="text-lg font-medium text-white mb-3 capitalize">
            {category} Poses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryPoses.map((pose) => (
              <div
                key={pose.id}
                onClick={() => onSelect(pose.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPose === pose.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
                }`}
              >
                <h4 className="font-medium text-white mb-2">{pose.name}</h4>
                <p className="text-sm text-gray-300 mb-2">{pose.description}</p>
                <div className="text-xs text-gray-400">
                  Compatible with: {pose.compatibleOutfits.length} outfits
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Outfit Selection Component
function OutfitSelection({ 
  outfits, 
  selectedOutfit, 
  onSelect,
  disabled = false
}: {
  outfits: OutfitDefinition[];
  selectedOutfit?: string;
  onSelect: (outfit: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {outfits.map((outfit) => (
          <div
            key={outfit.id}
            onClick={() => !disabled && onSelect(outfit.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedOutfit === outfit.id
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
            }`}
          >
            <h4 className="font-medium text-white mb-2">{outfit.name}</h4>
            <p className="text-sm text-gray-300 mb-2">{outfit.description}</p>
            <div className="text-xs text-gray-400">
              Compatible footwear: {outfit.compatibleFootwear.length} options
            </div>
          </div>
        ))}
      </div>
      {disabled && (
        <p className="text-sm text-gray-400 mt-2">
          Select a pose first to see compatible outfits
        </p>
      )}
    </div>
  );
}

// Footwear Selection Component
function FootwearSelection({ 
  footwear, 
  selectedFootwear, 
  onSelect,
  disabled = false
}: {
  footwear: FootwearDefinition[];
  selectedFootwear?: string;
  onSelect: (footwear: string) => void;
  disabled?: boolean;
}) {
  const groupedFootwear = footwear.reduce((acc, shoe) => {
    const brand = shoe.brand || 'Other';
    if (!acc[brand]) {
      acc[brand] = [];
    }
    acc[brand].push(shoe);
    return acc;
  }, {} as Record<string, FootwearDefinition[]>);

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="space-y-6">
        {Object.entries(groupedFootwear).map(([brand, brandFootwear]) => (
          <div key={brand}>
            <h3 className="text-lg font-medium text-white mb-3">{brand}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brandFootwear.map((shoe) => (
                <div
                  key={shoe.id}
                  onClick={() => !disabled && onSelect(shoe.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedFootwear === shoe.id
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
                  }`}
                >
                  <h4 className="font-medium text-white mb-1">{shoe.name}</h4>
                  {shoe.model && (
                    <p className="text-sm text-blue-400 mb-2">{shoe.model}</p>
                  )}
                  <p className="text-sm text-gray-300">{shoe.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {disabled && (
        <p className="text-sm text-gray-400 mt-2">
          Select an outfit first to see compatible footwear
        </p>
      )}
    </div>
  );
}

// Prop Selection Component
function PropSelection({ 
  props, 
  selectedProp, 
  onSelect,
  disabled = false
}: {
  props: PropDefinition[];
  selectedProp?: string;
  onSelect: (prop: string) => void;
  disabled?: boolean;
}) {
  const groupedProps = props.reduce((acc, prop) => {
    if (!acc[prop.category]) {
      acc[prop.category] = [];
    }
    acc[prop.category].push(prop);
    return acc;
  }, {} as Record<string, PropDefinition[]>);

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="mb-4">
        <button
          onClick={() => onSelect('')}
          className={`px-3 py-1 text-sm rounded-md ${
            !selectedProp
              ? 'bg-gray-600 text-gray-200'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          No Prop
        </button>
      </div>
      
      <div className="space-y-6">
        {Object.entries(groupedProps).map(([category, categoryProps]) => (
          <div key={category}>
            <h3 className="text-lg font-medium text-white mb-3 capitalize">
              {category} Props
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryProps.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => !disabled && onSelect(prop.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedProp === prop.id
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
                  }`}
                >
                  <h4 className="font-medium text-white mb-2">{prop.name}</h4>
                  <p className="text-sm text-gray-300 mb-2">{prop.description}</p>
                  <div className="text-xs text-gray-400">
                    Compatible poses: {prop.compatiblePoses.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {disabled && (
        <p className="text-sm text-gray-400 mt-2">
          Select a pose first to see compatible props
        </p>
      )}
    </div>
  );
}

// Frame Selection Component
function FrameSelection({ 
  frames, 
  selectedFrame, 
  onSelect,
  disabled = false
}: {
  frames: FrameDefinition[];
  selectedFrame?: string;
  onSelect: (frame: string) => void;
  frameType?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Frame selection is only available for onboarding and sequence types</p>
      </div>
    );
  }

  const groupedFrames = frames.reduce((acc, frame) => {
    if (!acc[frame.sequence]) {
      acc[frame.sequence] = [];
    }
    acc[frame.sequence].push(frame);
    return acc;
  }, {} as Record<string, FrameDefinition[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedFrames).map(([sequence, sequenceFrames]) => (
        <div key={sequence}>
          <h3 className="text-lg font-medium text-white mb-3 capitalize">
            {sequence.replace('-', ' ')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sequenceFrames.map((frame) => (
              <div
                key={frame.id}
                onClick={() => onSelect(frame.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedFrame === frame.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-white">{frame.name}</h4>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-200">
                    {frame.id}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{frame.location}</p>
                <p className="text-sm text-gray-400 mb-2">{frame.positioning}</p>
                {frame.voiceover && (
                  <p className="text-xs text-blue-400 italic">
                    "{frame.voiceover.substring(0, 100)}..."
                  </p>
                )}
                {frame.requiredProps.length > 0 && (
                  <div className="mt-2 text-xs text-orange-400">
                    Required props: {frame.requiredProps.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Validation Display Component
function ValidationDisplay({ validation }: { validation: ValidationResult }) {
  if (validation.isValid) {
    return (
      <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          <span className="text-green-200 font-medium">Selection is valid</span>
        </div>
        {validation.warnings && validation.warnings.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-green-300 mb-1">Warnings:</p>
            <ul className="text-sm text-green-300 list-disc list-inside">
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-2">
        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
        <span className="text-red-200 font-medium">Invalid selection</span>
      </div>
      
      {validation.errors.length > 0 && (
        <div className="mb-3">
          <p className="text-sm text-red-300 mb-1">Errors:</p>
          <ul className="text-sm text-red-300 list-disc list-inside">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.suggestions && validation.suggestions.length > 0 && (
        <div>
          <p className="text-sm text-blue-300 mb-1">Suggestions:</p>
          <ul className="text-sm text-blue-300 list-disc list-inside">
            {validation.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Selection Preview Component
function SelectionPreview({ selectedParams }: { selectedParams: Partial<ImageGenerationParams> }) {
  return (
    <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4 mb-6">
      <h3 className="font-medium text-white mb-3 flex items-center">
        <Settings className="h-4 w-4 mr-2" />
        Current Selection
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-200">Pose:</span>
          <p className="text-gray-300">{selectedParams.pose || 'Not selected'}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-200">Outfit:</span>
          <p className="text-gray-300">{selectedParams.outfit || 'Not selected'}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-200">Footwear:</span>
          <p className="text-gray-300">{selectedParams.footwear || 'Not selected'}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-200">Prop:</span>
          <p className="text-gray-300">{selectedParams.prop || 'None'}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-200">Frame Type:</span>
          <p className="text-gray-300">{selectedParams.frameType || 'Standard'}</p>
        </div>
        
        <div>
          <span className="font-medium text-gray-200">Frame:</span>
          <p className="text-gray-300">{selectedParams.frameId || 'None'}</p>
        </div>
      </div>
    </div>
  );
}