Here's a revised README.md for your GitHub project:

---

# HuggingFace API Demo with Next.js 14

This project is a demonstration of how to integrate the Hugging Face API for various inference tasks using a Next.js 14 app with the App Router. The demo showcases multiple use cases, including text completion, translation, image-to-text, and text-to-image generation.

## Features

- **Text Completion**: Generate text completions using the `mistralai/Mistral-7B-Instruct-v0.2` model.
- **Translation**: Translate text using the `t5-base` model.
- **Image to Text**: Convert images to text descriptions using the `nlpconnect/vit-gpt2-image-captioning` model.
- **Text to Image (JPEG/PNG)**: Generate images from text prompts using the `stabilityai/stable-diffusion-xl-base-1.0` model.

## Getting Started

### Prerequisites

- **Node.js**: Ensure you have Node.js installed on your machine.
- **Hugging Face API Key**: You'll need a Hugging Face API key to use the inference models. Sign up at [Hugging Face](https://huggingface.co/) if you don't have one.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/huggingface-api-demo.git
   cd huggingface-api-demo
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   - Copy the `.env.example` file to `.env.local`.
   - Replace `your_huggingface_token_here` with your Hugging Face API key in the `.env.local` file:

     ```env
     HF_TOKEN=your_huggingface_token_here
     ```

### Running the Development Server

Start the development server with the following command:

```bash
npm run dev
```

Then, open [http://localhost:3000](http://localhost:3000) in your browser to access the demo.

### Usage

Select a task type from the dropdown menu:

- **Completion**: Enter a message, and the app will generate a continuation.
- **Translation**: Provide text to translate.
- **Image to Text**: Upload an image to generate a text description.
- **Text to Image**: Enter a prompt to generate an image.

Click "Submit" to see the results. The app displays either the generated text or the image based on the selected task.

### API Route

The API route handling the inference is located at `pages/api/hf.ts`. This route uses the Hugging Face API to perform the tasks based on the request type.

### Example `.env` Configuration

Your `.env.local` file should look like this:

```env
HF_TOKEN=your_huggingface_token_here
```

## Learn More

To learn more about Next.js and the technologies used in this project, explore the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [Hugging Face API Documentation](https://huggingface.co/docs)

## Deployment

Deploy this project using the [Vercel Platform](https://vercel.com/), the easiest way to host your Next.js application. For detailed instructions, refer to the [Next.js deployment documentation](https://nextjs.org/docs/deployment).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any features or improvements.

## License

This project is licensed under the MIT License.

---

This README provides a clear overview of your project, including how to set it up, use it, and deploy it.
