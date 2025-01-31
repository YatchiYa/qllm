import { z } from "zod";
import { getEmbeddingProvider, getLLMProvider } from "qllm-lib";
import { EmbeddingProvider, LLMProvider } from "qllm-lib";
import { createFunctionToolFromZod } from "qllm-lib";


const testDeepSeek = async () => {
  console.log("🚀 Starting DeepSeek Tests");

  const deepseekModels = {
    textModelName: "DeepSeek-R1-Distill-Llama-70B",
  };

  await testListModels("deepseek");
  await testLLMModel("deepseek", { maxTokens: 512 }, deepseekModels);

  console.log("✅ DeepSeek Tests completed");
};

const testListModels = async (providerName: string) => {
  console.log(`📋 Listing models for provider: ${providerName}`);
  const provider = await getLLMProvider(providerName);
  const models = await provider.listModels();
  console.log("📊 Available models:");
  console.dir(models, { depth: null });
  console.log("✅ Model listing completed");
};

const testLLMModel = async (
  providerName: string,
  options: { maxTokens: number },
  models: {
    textModelName: string;
  }
) => {
  console.log(`🧪 Testing LLM model with provider: ${providerName}`);

  const provider = await getLLMProvider(providerName);
  console.log(`🔧 ${providerName}Provider instance created`);

  await testCompletion(provider, {
    model: models.textModelName,
    maxTokens: options.maxTokens,
  });

  await testStream(provider, {
    model: models.textModelName,
    maxTokens: options.maxTokens,
  });

  console.log(`✅ LLM model test completed for ${providerName}`);
};

async function testCompletion(
  provider: LLMProvider,
  options: { model: string; maxTokens: number }
) {
  console.log("🔤 Starting text completion test");
  const result = await provider.generateChatCompletion({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "What is the capital of France?",
        },
      },
    ],
    options: { model: options.model, maxTokens: options.maxTokens },
  });

  console.log("📝 Completion result:", result);
  console.log("✅ Text completion test completed");
}

async function testStream(
  provider: LLMProvider,
  options: { model: string; maxTokens: number }
) {
  console.log("🌊 Starting streaming completion test");
  const result = await provider.streamChatCompletion({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Write a small story about Paris. Less than 200 words.",
        },
      },
    ],
    options: { model: options.model, maxTokens: options.maxTokens },
  });

  console.log("📜 Streaming result:");
  for await (const message of result) {
    process.stdout.write(message.text || "");
  }
  console.log("\n✅ Streaming completion test completed");
}

// Execute the DeepSeek Tests
testDeepSeek()
  .then(() => console.log("🎉 All DeepSeek Tests executed successfully"))
  .catch((error) => console.error("❌ Error during DeepSeek tests execution:", error));
