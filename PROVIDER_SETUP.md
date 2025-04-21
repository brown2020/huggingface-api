# Setting Up Inference Providers

Hugging Face has recently changed their Inference API to use a provider-based system. This means that instead of HF hosting all models directly, they now route requests to third-party providers like Replicate, Together AI, fal.ai, Fireworks.ai, and others.

## Using Fireworks.ai and Replicate Together

If you have both Fireworks.ai and Replicate API keys, you can access a comprehensive range of models that complement each other's strengths. This dual-provider setup gives you the best of both worlds:

### Fireworks.ai Strengths

#### Large Language Models (LLMs)

Fireworks.ai excels at serving high-performance LLMs with optimized infrastructure:

- **Llama Models**: Llama 3.1, Llama 3.2, Llama 4 (Maverick and Scout)
- **DeepSeek Models**: DeepSeek-R1, DeepSeek-V3
- **Mistral Models**: Mistral-7B-Instruct, Mistral-Small-24B
- **Qwen Models**: Qwen2.5-Coder-32B-Instruct

#### Image Generation Models

Fireworks.ai has particular strengths with:

- **Stable Diffusion 3.5**: Latest SD models with excellent quality
- **FLUX.1**: Specialized high-quality image generation

### Replicate Strengths

#### Diverse Image Generation

Replicate offers a wide variety of image generation models:

- **Stable Diffusion Variants**: Many SD versions including specialized finetuned models
- **Custom Models**: PortraitPlus, Openjourney, Anything-v4.0
- **Image Editing**: Models like Instruct-Pix2Pix for image modification

#### Specialized Media Models

- **Text-to-Speech**: Suno/Bark for audio generation
- **Multimodal**: LLaVA and other multimodal models
- **Video Generation**: Text-to-video capabilities

## Setting Up Both Providers

1. **Create accounts with both providers**:

   - Visit [fireworks.ai](https://fireworks.ai) and sign up
   - Visit [replicate.com](https://replicate.com) and sign up
   - Generate API keys from both platforms

2. **Add your API keys to the environment**:
   Add the following to your `.env.local` file:

```
HF_TOKEN=your_huggingface_token
FIREWORKS_API_TOKEN=your_fireworks_token
REPLICATE_API_TOKEN=your_replicate_token
```

3. **Model Selection Logic**: The application now intelligently routes each model to the most appropriate provider:
   - LLMs primarily use Fireworks.ai for performance
   - Image generation models use Replicate for diversity or Fireworks for specific models
   - Other specialized tasks use the provider with the best implementation

## How Model Selection Works

The application uses a sophisticated model-to-provider mapping strategy:

1. **Explicit Mapping**: Many popular models are explicitly mapped to either Fireworks or Replicate based on which provider offers the best implementation.

2. **Task-Based Fallback**: If a model isn't explicitly mapped, the application chooses based on the task type:

   - For image generation: defaults to Replicate for its broader model selection
   - For text generation/chat: defaults to Fireworks for its optimized LLM infrastructure

3. **Pattern Matching**: As a final fallback, Stable Diffusion models go to Replicate, while other models default to Fireworks

## Pricing Considerations

Both providers have different pricing models:

**Fireworks.ai**:

- LLMs range from $0.15/M tokens for smaller models to $3.00/M tokens for premium models
- Image generation starts around $0.035 per image

**Replicate**:

- Per-model pricing varies widely
- Many specialized models available at competitive rates
- Generally more models to choose from across different tasks

## Resources

- [Fireworks.ai Model Library](https://fireworks.ai/models)
- [Replicate Models](https://replicate.com/models)
- [Hugging Face Inference Providers Documentation](https://huggingface.co/docs/inference-providers/en/)
