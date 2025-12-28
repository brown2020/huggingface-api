# HuggingFace API Integration with Next.js (App Router)

This project is a demo application that showcases how to integrate the Hugging Face API (Inference Providers) with a modern Next.js App Router app. The demo includes text completion, translation, image-to-text, and text-to-image generation.

## Features

- **Text Completion:** Chat completions via Hugging Face Inference + provider routing.
- **Translation:** Uses the same chat completion path with a translation prompt.
- **Image to Text:** Image captioning via Replicate (LLaVA-13B).
- **Text to Image:** PNG generation via HF Inference `textToImage`.

## Tech Stack (current)

This repo is currently pinned (via `package-lock.json`) to:

- **Next.js**: `16.1.1`
- **React / React DOM**: `19.2.3`
- **Hugging Face Inference SDK**: `@huggingface/inference@4.13.5`
- **Replicate SDK**: `replicate@1.4.0`
- **Validation**: `zod@4.2.1`

### Runtime requirements

- **Node.js**: `>= 20.9.0` (required by Next.js `16.1.1`)

## Getting Started

### Prerequisites

- **Node.js:** `>= 20.9.0` (required by Next.js `16.1.1`).
- **Hugging Face API Key:** Register at Hugging Face and obtain an API key.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/brown2020/huggingface-api.git
   cd huggingface-api
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   - Copy `.env.example` to `.env.local`.
   - Add your Hugging Face API key to the `.env.local` file.
   - (Optional) Add your Replicate API token if you want to use the Image-to-Text feature.

   ```bash
   HF_TOKEN=your_huggingface_token_here
   REPLICATE_API_TOKEN=your_replicate_token_here
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

The API route for handling requests is located at `src/app/api/hf/route.ts`.

## Example `.env` Configuration

```bash
HF_TOKEN=your_huggingface_token_here
REPLICATE_API_TOKEN=your_replicate_token_here
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Hugging Face API Documentation](https://huggingface.co/docs)

## Deployment

Deploy this project on Vercel for easy hosting of your Next.js application. Refer to the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See `LICENSE.md`.
