````markdown
# HuggingFace API Integration with Next.js 14

This project is a demo application that showcases how to integrate the Hugging Face API with a Next.js 14 application using the App Router. The demo includes various NLP and image processing tasks like text completion, translation, image-to-text, and text-to-image generation.

## Features

- **Text Completion:** Utilize the `mistralai/Mistral-7B-Instruct-v0.2` model for generating text completions.
- **Translation:** Translate text using the `t5-base` model.
- **Image to Text:** Generate text descriptions from images with the `nlpconnect/vit-gpt2-image-captioning` model.
- **Text to Image:** Create images from text prompts using the `stabilityai/stable-diffusion-xl-base-1.0` model.

## Getting Started

### Prerequisites

- **Node.js:** Ensure Node.js is installed.
- **Hugging Face API Key:** Register at Hugging Face and obtain an API key.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/huggingface-api.git
   cd huggingface-api
   ```
````

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   - Copy `.env.example` to `.env.local`.
   - Add your Hugging Face API key to the `.env.local` file:

   ```bash
   HF_TOKEN=your_huggingface_token_here
   ```

### Running the Development Server

To start the server, run:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Usage

Select a task (e.g., Text Completion, Translation, Image to Text, Text to Image) and submit your input. The app will display the corresponding output.

## API Route

The API route for handling requests is located at `pages/api/hf.ts`, which interacts with the Hugging Face API to process different tasks.

## Example `.env` Configuration

```bash
HF_TOKEN=your_huggingface_token_here
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Hugging Face API Documentation](https://huggingface.co/docs)

## Deployment

Deploy this project on Vercel for easy hosting of your Next.js application. Refer to the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements.

## License

This project is licensed under the MIT License.

```

```
