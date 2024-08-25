// packages/qllm-cli/src/commands/chat-command.ts

import { Command } from "commander";
import { getListProviderNames, getLLMProvider } from "qllm-lib";
import { Chat } from "../chat/chat";
import { chatConfig } from "../chat/chat-config";
import { output } from "../utils/output";
import { CliConfigManager } from "../utils/cli-config-manager";

export const chatCommand = new Command("chat")
  .description("Start an interactive chat session with an LLM")
  .option("-p, --provider <provider>", "LLM provider to use")
  .option("-m, --model <model>", "Model to use")
  .option(
    "--max-tokens <number>",
    "Maximum number of tokens to generate",
    parseInt
  )
  .option(
    "--temperature <number>",
    "Temperature for response generation",
    parseFloat
  )
  .option("--top-p <number>", "Top P value for response generation", parseFloat)
  .option(
    "--frequency-penalty <number>",
    "Frequency penalty for response generation",
    parseFloat
  )
  .option(
    "--presence-penalty <number>",
    "Presence penalty for response generation",
    parseFloat
  )
  .option(
    "--stop-sequence <sequence>",
    "Stop sequence for response generation",
    (value, previous) => previous.concat([value]),
    [] as string[]
  )
  .action(async (options) => {
    try {
      await chatConfig.initialize();

      const providerName =
        options.provider ||
        CliConfigManager.getInstance().get("defaultProvider") ||
        "openai";
      const modelName =
        options.model ||
        CliConfigManager.getInstance().get("defaultModel") ||
        "gpt-4o-mini";

      const availableProviders = getListProviderNames();
      if (!availableProviders.includes(providerName)) {
        output.warn(
          `Invalid provider "${providerName}". Available providers: ${availableProviders.join(
            ", "
          )}`
        );
        output.info("Use the 'configure' command to set a valid provider.");
        output.info("Use the '/providers' command to see available providers."); 
      }

      const provider = await getLLMProvider(providerName);
      const models = await provider.listModels();

      if (!models.some((m) => m.id === modelName)) {
        output.warn(
          `Invalid model "${modelName}" for provider "${providerName}".`
        );
        output.info("Available models:");
        models.forEach((m) => output.info(`- ${m.id}`));
        output.info("Use the 'configure' command to set a valid model.");
        output.info("Use the '/models' command to see available models.");
      }

      const chat = new Chat(providerName, modelName);

      await chat.start();
    } catch (error) {
      output.error("An error occurred while starting the chat:");
      console.error(error);
    }
  });
