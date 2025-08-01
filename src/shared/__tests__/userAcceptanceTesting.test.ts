/**
 * User Acceptance Testing Suite for Capitão Caverna Image Engine
 * 
 * This test suite validates complete user workflows from selection to image delivery,
 * error handling mechanisms, performance under realistic usage patterns,
 * and overall system usability.
 * 
 * Requirements covered: All user-facing requirements (1.1-10.4)
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { AuthContext } from '@/react-app/contexts/AuthContext';
import ImageGeneration from '@/react-app/pages/ImageGeneration';
import ImageGenerationInterface from '@/react-app/components/ImageGenerationInterface';
import GenerationStatusDisplay from '@/react-app/components/GenerationStatusDisplay';
import ImageGallery from '@/react-app/components/ImageGallery';
import { 
  ImageGenerationParams, 
  ImageGenerationResponse, 
  PromptOptions,
  ValidationResult,
  GeneratedImageRecord
} from '@/shared/types';

// Mock data for testing
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  provider: 'google' as const,
  isAdmin: false
};

const mockAdminUser = {
  ...mockUser,
  isAdmin: true
};

const mockPromptOptions: PromptOptions = {
  poses: [
    {
      id: 'arms-crossed',
      name: 'Arms Crossed',
      description: 'Confident pose with arms crossed',
      category: 'primary',
      compatibleOutfits: ['hoodie-sweatpants', 'tshirt-shorts'],
      promptFragment: 'arms crossed confidently'
    },
    {
      id: 'pointing-forward',
      name: 'Pointing Forward',
      description: 'Dynamic pointing gesture',
      category: 'primary',
      compatibleOutfits: ['hoodie-sweatpants', 'windbreaker-shorts'],
      promptFragment: 'pointing forward dynamically'
    },
    {
      id: 'sitting-rock',
      name: 'Sitting on Rock',
      description: 'Relaxed sitting pose on cave rock',
      category: 'onboarding',
      compatibleOutfits: ['tshirt-shorts'],
      promptFragment: 'sitting relaxed on cave rock'
    }
  ],
  outfits: [
    {
      id: 'hoodie-sweatpants',
      name: 'Hoodie + Sweatpants',
      description: 'Comfortable hoodie with matching sweatpants',
      compatibleFootwear: ['jordan-1-chicago', 'jordan-11-bred'],
      promptFragment: 'wearing comfortable hoodie and sweatpants'
    },
    {
      id: 'tshirt-shorts',
      name: 'T-shirt + Shorts',
      description: 'Casual t-shirt with comfortable shorts',
      compatibleFootwear: ['jordan-1-chicago', 'air-max-90'],
      promptFragment: 'wearing casual t-shirt and shorts'
    },
    {
      id: 'windbreaker-shorts',
      name: 'Windbreaker + Shorts',
      description: 'Athletic windbreaker with shorts',
      compatibleFootwear: ['jordan-11-bred', 'air-max-90'],
      promptFragment: 'wearing athletic windbreaker and shorts'
    }
  ],
  footwear: [
    {
      id: 'jordan-1-chicago',
      name: 'Air Jordan 1 Chicago',
      brand: 'Nike',
      model: 'Air Jordan 1 Retro High OG "Chicago"',
      description: 'Classic red, white, and black colorway',
      promptFragment: 'wearing Air Jordan 1 Chicago sneakers'
    },
    {
      id: 'jordan-11-bred',
      name: 'Air Jordan 11 Bred',
      brand: 'Nike',
      model: 'Air Jordan 11 Retro "Bred"',
      description: 'Black and red patent leather design',
      promptFragment: 'wearing Air Jordan 11 Bred sneakers'
    },
    {
      id: 'air-max-90',
      name: 'Air Max 90',
      brand: 'Nike',
      model: 'Air Max 90',
      description: 'Classic Air Max with visible air cushioning',
      promptFragment: 'wearing Air Max 90 sneakers'
    }
  ],
  props: [
    {
      id: 'cave-map',
      name: 'Cave Map',
      description: 'Ancient cave exploration map',
      category: 'onboarding',
      compatiblePoses: ['pointing-forward', 'sitting-rock'],
      promptFragment: 'holding ancient cave map'
    },
    {
      id: 'glowing-hourglass',
      name: 'Glowing Hourglass',
      description: 'Mystical hourglass with glowing sand',
      category: 'onboarding',
      compatiblePoses: ['arms-crossed', 'sitting-rock'],
      promptFragment: 'holding mystical glowing hourglass'
    }
  ],
  frames: [
    {
      id: '01A',
      name: 'Welcome Frame',
      sequence: 'onboarding-sequence',
      location: 'Cave entrance with natural lighting',
      positioning: 'Standing at cave threshold',
      limbMetrics: 'Arms at sides, relaxed stance',
      poseSpecifics: 'Welcoming gesture with slight smile',
      facialExpression: 'Warm, inviting expression',
      lighting: 'Natural sunlight from behind, cave glow ahead',
      camera: 'Medium shot, eye level',
      environmentalTouches: 'Cave crystals glowing softly',
      voiceover: 'Welcome to the cave, adventurer!',
      requiredProps: []
    },
    {
      id: '02B',
      name: 'Map Introduction',
      sequence: 'onboarding-sequence',
      location: 'Inside cave chamber',
      positioning: 'Standing beside cave wall',
      limbMetrics: 'One hand holding map, other pointing',
      poseSpecifics: 'Explaining cave layout',
      facialExpression: 'Focused, educational',
      lighting: 'Cave crystal illumination',
      camera: 'Medium close-up',
      environmentalTouches: 'Ancient cave paintings visible',
      voiceover: 'This map will guide your journey through the depths.',
      requiredProps: ['cave-map']
    }
  ]
};

const mockValidationResult: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: ['This combination may result in longer generation time'],
  suggestions: ['Consider using a different footwear for better visual balance']
};

const mockGenerationResponse: ImageGenerationResponse = {
  success: true,
  imageId: 'img-123',
  status: 'COMPLETE',
  imageUrl: 'https://example.com/generated-image.jpg',
  metadata: {
    generationTime: 15000,
    serviceUsed: 'midjourney',
    promptUsed: 'Test prompt for generated image'
  }
};

const mockGeneratedImages: GeneratedImageRecord[] = [
  {
    image_id: 'img-123',
    user_id: 'test-user-123',
    r2_object_key: 'images/img-123.jpg',
    prompt_parameters: JSON.stringify({
      pose: 'arms-crossed',
      outfit: 'hoodie-sweatpants',
      footwear: 'jordan-1-chicago'
    }),
    created_at: new Date().toISOString(),
    status: 'COMPLETE',
    generation_time_ms: 15000,
    service_used: 'midjourney'
  },
  {
    image_id: 'img-124',
    user_id: 'test-user-123',
    r2_object_key: 'images/img-124.jpg',
    prompt_parameters: JSON.stringify({
      pose: 'pointing-forward',
      outfit: 'tshirt-shorts',
      footwear: 'jordan-11-bred',
      prop: 'cave-map'
    }),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'COMPLETE',
    generation_time_ms: 18000,
    service_used: 'dalle'
  }
];

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to render components with context
const renderWithContext = (component: React.ReactElement, user = mockUser) => {
  const authContextValue = {
    user,
    loading: false,
    loginWithGoogle: vi.fn(),
    logout: vi.fn()
  };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authContextValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('User Acceptance Testing - Complete User Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('UAT-1: Complete Image Generation Workflow', () => {
    it('should allow user to complete full generation workflow from selection to delivery', async () => {
      const user = userEvent.setup();
      
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPromptOptions)
        }) // Options API
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidationResult)
        }) // Validation API
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGenerationResponse)
        }); // Generation API

      const mockOnGenerate = vi.fn();
      
      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={mockOnGenerate}
          isGenerating={false}
        />
      );

      // Wait for options to load
      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Step 1: Select pose
      const poseTab = screen.getByRole('button', { name: /pose/i });
      await user.click(poseTab);
      
      await waitFor(() => {
        expect(screen.getByText('Arms Crossed')).toBeInTheDocument();
      });
      
      const armsCrossedPose = screen.getByText('Arms Crossed');
      await user.click(armsCrossedPose);

      // Step 2: Select outfit
      const outfitTab = screen.getByRole('button', { name: /outfit/i });
      await user.click(outfitTab);
      
      await waitFor(() => {
        expect(screen.getByText('Hoodie + Sweatpants')).toBeInTheDocument();
      });
      
      const hoodieOutfit = screen.getByText('Hoodie + Sweatpants');
      await user.click(hoodieOutfit);

      // Step 3: Select footwear
      const footwearTab = screen.getByRole('button', { name: /footwear/i });
      await user.click(footwearTab);
      
      await waitFor(() => {
        expect(screen.getByText('Air Jordan 1 Chicago')).toBeInTheDocument();
      });
      
      const jordanFootwear = screen.getByText('Air Jordan 1 Chicago');
      await user.click(jordanFootwear);

      // Step 4: Generate image
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      expect(generateButton).not.toBeDisabled();
      
      await user.click(generateButton);

      // Verify generation was called with correct parameters
      expect(mockOnGenerate).toHaveBeenCalledWith({
        pose: 'arms-crossed',
        outfit: 'hoodie-sweatpants',
        footwear: 'jordan-1-chicago',
        frameType: 'standard'
      });
    });

    it('should handle onboarding frame sequence generation', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPromptOptions)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidationResult)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGenerationResponse)
        });

      const mockOnGenerate = vi.fn();
      
      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={mockOnGenerate}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Select onboarding frame type
      const onboardingButton = screen.getByRole('button', { name: /onboarding/i });
      await user.click(onboardingButton);

      // Select pose, outfit, footwear (abbreviated for test)
      const poseTab = screen.getByRole('button', { name: /pose/i });
      await user.click(poseTab);
      await user.click(screen.getByText('Sitting on Rock'));

      const outfitTab = screen.getByRole('button', { name: /outfit/i });
      await user.click(outfitTab);
      await user.click(screen.getByText('T-shirt + Shorts'));

      const footwearTab = screen.getByRole('button', { name: /footwear/i });
      await user.click(footwearTab);
      await user.click(screen.getByText('Air Jordan 1 Chicago'));

      // Select specific frame
      const framesTab = screen.getByRole('button', { name: /frames/i });
      await user.click(framesTab);
      
      await waitFor(() => {
        expect(screen.getByText('Welcome Frame')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Welcome Frame'));

      // Generate
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      await user.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith({
        pose: 'sitting-rock',
        outfit: 'tshirt-shorts',
        footwear: 'jordan-1-chicago',
        frameType: 'onboarding',
        frameId: '01A'
      });
    });
  });

  describe('UAT-2: Error Handling and User Feedback', () => {
    it('should display validation errors and prevent generation', async () => {
      const user = userEvent.setup();
      
      const invalidValidationResult: ValidationResult = {
        isValid: false,
        errors: ['Selected outfit is not compatible with chosen pose'],
        warnings: [],
        suggestions: ['Try selecting "T-shirt + Shorts" instead']
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPromptOptions)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(invalidValidationResult)
        });

      const mockOnGenerate = vi.fn();
      
      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={mockOnGenerate}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Make selections that will trigger validation error
      const poseTab = screen.getByRole('button', { name: /pose/i });
      await user.click(poseTab);
      await user.click(screen.getByText('Arms Crossed'));

      const outfitTab = screen.getByRole('button', { name: /outfit/i });
      await user.click(outfitTab);
      await user.click(screen.getByText('Windbreaker + Shorts')); // Incompatible

      const footwearTab = screen.getByRole('button', { name: /footwear/i });
      await user.click(footwearTab);
      await user.click(screen.getByText('Air Jordan 11 Bred'));

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('Invalid selection')).toBeInTheDocument();
      });

      // Verify error message is displayed
      expect(screen.getByText('Selected outfit is not compatible with chosen pose')).toBeInTheDocument();
      expect(screen.getByText('Try selecting "T-shirt + Shorts" instead')).toBeInTheDocument();

      // Verify generate button is disabled
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      expect(generateButton).toBeDisabled();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPromptOptions)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidationResult)
        })
        .mockRejectedValueOnce(new Error('Network error')); // Generation fails

      const mockOnGenerate = vi.fn();
      
      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={mockOnGenerate}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Make valid selections
      const poseTab = screen.getByRole('button', { name: /pose/i });
      await user.click(poseTab);
      await user.click(screen.getByText('Arms Crossed'));

      const outfitTab = screen.getByRole('button', { name: /outfit/i });
      await user.click(outfitTab);
      await user.click(screen.getByText('Hoodie + Sweatpants'));

      const footwearTab = screen.getByRole('button', { name: /footwear/i });
      await user.click(footwearTab);
      await user.click(screen.getByText('Air Jordan 1 Chicago'));

      // Attempt generation
      const generateButton = screen.getByRole('button', { name: /generate image/i });
      await user.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalled();
    });

    it('should display generation status and allow retry on failure', async () => {
      const user = userEvent.setup();
      
      const failedResponse: ImageGenerationResponse = {
        success: false,
        error: 'External service temporarily unavailable',
        retryAfter: 30
      };

      const mockOnRetry = vi.fn();
      
      renderWithContext(
        <GenerationStatusDisplay 
          result={failedResponse}
          onRetry={mockOnRetry}
        />
      );

      // Verify error is displayed
      expect(screen.getByText(/external service temporarily unavailable/i)).toBeInTheDocument();
      
      // Verify retry button is available
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      await user.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('UAT-3: Performance Under Realistic Usage', () => {
    it('should handle concurrent generation requests efficiently', async () => {
      const startTime = Date.now();
      
      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => 
        fetch('/api/v1/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: {
              pose: 'arms-crossed',
              outfit: 'hoodie-sweatpants',
              footwear: 'jordan-1-chicago'
            }
          })
        })
      );

      // Mock responses for concurrent requests
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGenerationResponse)
        })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // Verify all requests completed successfully
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
      
      // Verify reasonable response time (should handle 5 concurrent requests in under 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should load options quickly on interface initialization', async () => {
      const startTime = Date.now();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPromptOptions)
      });

      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={vi.fn()}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;
      
      // Options should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    it('should efficiently filter compatible options based on selections', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPromptOptions)
      });

      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={vi.fn()}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Select pose
      const poseTab = screen.getByRole('button', { name: /pose/i });
      await user.click(poseTab);
      await user.click(screen.getByText('Arms Crossed'));

      // Switch to outfit tab - should show only compatible outfits
      const outfitTab = screen.getByRole('button', { name: /outfit/i });
      await user.click(outfitTab);

      // Verify filtering happened quickly (compatible outfits should be visible)
      expect(screen.getByText('Hoodie + Sweatpants')).toBeInTheDocument();
      expect(screen.getByText('T-shirt + Shorts')).toBeInTheDocument();
      
      // Windbreaker should not be available for arms-crossed pose
      expect(screen.queryByText('Windbreaker + Shorts')).not.toBeInTheDocument();
    });
  });

  describe('UAT-4: Image Quality and System Usability', () => {
    it('should display generated images with proper metadata', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockGeneratedImages })
      });

      renderWithContext(
        <ImageGallery 
          userId="test-user-123"
          showDeleteActions={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/generated images/i)).toBeInTheDocument();
      });

      // Verify images are displayed with metadata
      expect(screen.getByText(/arms crossed/i)).toBeInTheDocument();
      expect(screen.getByText(/hoodie/i)).toBeInTheDocument();
      expect(screen.getByText(/jordan 1/i)).toBeInTheDocument();
      
      // Verify generation time is displayed
      expect(screen.getByText(/15.0s/)).toBeInTheDocument();
      expect(screen.getByText(/18.0s/)).toBeInTheDocument();
    });

    it('should provide clear visual feedback during generation', async () => {
      const user = userEvent.setup();
      
      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={vi.fn()}
          isGenerating={true}
        />
      );

      // Verify loading state is shown
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      
      // Verify generate button is disabled during generation
      const generateButton = screen.getByRole('button', { name: /generating/i });
      expect(generateButton).toBeDisabled();
    });

    it('should show parameter preview before generation', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPromptOptions)
      });

      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={vi.fn()}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Make selections
      const poseTab = screen.getByRole('button', { name: /pose/i });
      await user.click(poseTab);
      await user.click(screen.getByText('Arms Crossed'));

      // Show preview
      const previewButton = screen.getByRole('button', { name: /show.*selection preview/i });
      await user.click(previewButton);

      // Verify preview shows selected parameters
      expect(screen.getByText('Current Selection')).toBeInTheDocument();
      expect(screen.getByText('arms-crossed')).toBeInTheDocument();
    });

    it('should handle admin features for image management', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ images: mockGeneratedImages })
      });

      renderWithContext(
        <ImageGallery 
          userId="test-user-123"
          showDeleteActions={true}
        />,
        mockAdminUser
      );

      await waitFor(() => {
        expect(screen.getByText(/generated images/i)).toBeInTheDocument();
      });

      // Verify admin actions are available
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('UAT-5: Authentication and Authorization', () => {
    it('should redirect unauthenticated users to login', () => {
      const authContextValue = {
        user: null,
        loading: false,
        loginWithGoogle: vi.fn(),
        logout: vi.fn()
      };

      render(
        <BrowserRouter>
          <AuthContext.Provider value={authContextValue}>
            <ImageGeneration />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Please log in to access the image generation feature.')).toBeInTheDocument();
    });

    it('should show loading state during authentication', () => {
      const authContextValue = {
        user: null,
        loading: true,
        loginWithGoogle: vi.fn(),
        logout: vi.fn()
      };

      render(
        <BrowserRouter>
          <AuthContext.Provider value={authContextValue}>
            <ImageGeneration />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display user information when authenticated', () => {
      renderWithContext(<ImageGeneration />);

      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      expect(screen.getByAltText('Test User')).toBeInTheDocument();
    });
  });

  describe('UAT-6: Navigation and User Experience', () => {
    it('should allow switching between generation and history tabs', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPromptOptions)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ images: mockGeneratedImages })
        });

      renderWithContext(<ImageGeneration />);

      await waitFor(() => {
        expect(screen.getByText('Capitão Caverna Image Generator')).toBeInTheDocument();
      });

      // Switch to history tab
      const historyTab = screen.getByRole('button', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText(/generated images/i)).toBeInTheDocument();
      });

      // Switch back to generate tab
      const generateTab = screen.getByRole('button', { name: /generate/i });
      await user.click(generateTab);

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });
    });

    it('should provide clear navigation back to home', async () => {
      const user = userEvent.setup();
      
      renderWithContext(<ImageGeneration />);

      const backButton = screen.getByRole('link', { name: /back to home/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('href', '/');
    });
  });

  describe('UAT-7: Responsive Design and Accessibility', () => {
    it('should be accessible with proper ARIA labels', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPromptOptions)
      });

      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={vi.fn()}
          isGenerating={false}
        />
      );

      // Check for proper button roles
      expect(screen.getByRole('button', { name: /pose/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /outfit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /footwear/i })).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPromptOptions)
      });

      renderWithContext(
        <ImageGenerationInterface 
          onGenerate={vi.fn()}
          isGenerating={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
      });

      // Test tab navigation
      const poseTab = screen.getByRole('button', { name: /pose/i });
      poseTab.focus();
      
      await user.keyboard('{Enter}');
      
      // Should activate the pose tab
      expect(poseTab).toHaveClass('border-blue-500');
    });
  });
});

describe('UAT Performance Benchmarks', () => {
  it('should meet performance benchmarks for critical user paths', async () => {
    const performanceMetrics = {
      optionsLoad: 0,
      validationTime: 0,
      generationRequest: 0,
      imageDisplay: 0
    };

    // Test options loading performance
    const optionsStart = performance.now();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPromptOptions)
    });

    renderWithContext(
      <ImageGenerationInterface 
        onGenerate={vi.fn()}
        isGenerating={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
    });
    
    performanceMetrics.optionsLoad = performance.now() - optionsStart;

    // Performance assertions
    expect(performanceMetrics.optionsLoad).toBeLessThan(1000); // Options should load in under 1 second
    
    console.log('Performance Metrics:', performanceMetrics);
  });
});

describe('UAT Error Recovery and Resilience', () => {
  it('should recover gracefully from network failures', async () => {
    const user = userEvent.setup();
    
    // First request fails, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPromptOptions)
      });

    renderWithContext(
      <ImageGenerationInterface 
        onGenerate={vi.fn()}
        isGenerating={false}
      />
    );

    // Should show error initially
    await waitFor(() => {
      expect(screen.getByText(/failed to load options/i)).toBeInTheDocument();
    });

    // Simulate retry (component would need retry mechanism)
    // This tests the error state display
    expect(screen.getByText(/failed to load options/i)).toBeInTheDocument();
  });

  it('should handle partial data gracefully', async () => {
    const partialOptions: Partial<PromptOptions> = {
      poses: mockPromptOptions.poses,
      outfits: [], // Empty outfits array
      footwear: mockPromptOptions.footwear,
      props: mockPromptOptions.props,
      frames: mockPromptOptions.frames
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(partialOptions)
    });

    renderWithContext(
      <ImageGenerationInterface 
        onGenerate={vi.fn()}
        isGenerating={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Generate Capitão Caverna Image')).toBeInTheDocument();
    });

    // Should handle empty outfits gracefully
    const outfitTab = screen.getByRole('button', { name: /outfit/i });
    await userEvent.click(outfitTab);
    
    // Should show appropriate message for empty state
    expect(screen.getByText(/select a pose first/i)).toBeInTheDocument();
  });
});