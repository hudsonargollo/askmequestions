// Simple debug script to check compatibility
import { PromptTemplateEngineImpl } from './src/shared/promptTemplateEngineImpl.js';

const engine = new PromptTemplateEngineImpl();
const params = { 
  pose: 'arms-crossed', 
  outfit: 'hoodie-sweatpants', 
  footwear: 'air-jordan-1-chicago' 
};

console.log('Testing parameters:', params);

const validation = engine.validateParameters(params);
console.log('Validation result:', JSON.stringify(validation, null, 2));

if (validation.isValid) {
  try {
    const prompt = engine.buildPrompt(params);
    console.log('Prompt generated successfully');
    console.log('Prompt length:', prompt.length);
  } catch (error) {
    console.error('Error building prompt:', error.message);
  }
} else {
  console.log('Parameters are invalid');
}

// Check available options
const options = engine.getAvailableOptions();
console.log('\nAvailable poses:', options.poses.map(p => p.id));
console.log('Available outfits:', options.outfits.map(o => o.id));
console.log('Available footwear:', options.footwear.map(f => f.id));

// Check specific compatibility
const pose = options.poses.find(p => p.id === 'arms-crossed');
console.log('\nArms-crossed pose compatible outfits:', pose?.compatibleOutfits);

const outfit = options.outfits.find(o => o.id === 'hoodie-sweatpants');
console.log('Hoodie-sweatpants outfit compatible footwear:', outfit?.compatibleFootwear);