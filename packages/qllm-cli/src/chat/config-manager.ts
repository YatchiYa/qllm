// packages/qllm-cli/src/chat/config-manager.ts
import { ChatConfig } from "./chat-config";
import { getLLMProvider } from "qllm-lib";
import { output } from "../utils/output";
import { DEFAULT_PROVIDER, DEFAULT_MODEL } from "../constants";

export class ConfigManager {
  constructor(private config: ChatConfig) {}

  async setProvider(providerName: string): Promise<void> {
    try {
      await getLLMProvider(providerName);
      this.config.setProvider(providerName);
    } catch (error) {
      output.error(`Failed to set provider: ${(error as Error).message}`);
    }
  }

  getConfig(): ChatConfig { 
    return this.config;
  }

  getProvider(): string {
    return this.config.getProvider() || DEFAULT_PROVIDER;
  }

  setModel(modelName: string): void {
    this.config.setModel(modelName);
    output.success(`Model set to: ${modelName}`);
  }

  getModel(): string {
    return this.config.getModel() || DEFAULT_MODEL;
  }

  async setOption(option: string, value: string): Promise<void> {
    const evalOption = option?.trim().toLowerCase();
    switch (evalOption) {
      case "temperature":
        this.config.setTemperature(parseFloat(value));
        break;
      case "max_tokens":
        this.config.setMaxTokens(parseInt(value, 10));
        break;
      case "top_p":
        this.config.setTopP(parseFloat(value));
        break;
      case "frequency_penalty":
        this.config.setFrequencyPenalty(parseFloat(value));
        break;
      case "presence_penalty":
        this.config.setPresencePenalty(parseFloat(value));
        break;
      case "stop_sequence":
        this.config.setStopSequence(value.split(","));
        break;
      default:
        output.error(`Unknown option: ${option}`);
        this.showValidOptions();
        return;
    }
    output.success(`Option ${evalOption} set to: ${value}`);
  }

  getAllSettings(): Record<string, any> {
    return {
      provider: this.getProvider(),
      model: this.getModel(),
      temperature: this.config.getTemperature(),
      maxTokens: this.config.getMaxTokens(),
      topP: this.config.getTopP(),
      frequencyPenalty: this.config.getFrequencyPenalty(),
      presencePenalty: this.config.getPresencePenalty(),
      stopSequence: this.config.getStopSequence(),
    };
  }

  private showValidOptions(): void {
    output.info("Valid options are:");
    [
      "temperature",
      "max_tokens",
      "top_p",
      "frequency_penalty",
      "presence_penalty",
      "stop_sequence",
    ].forEach((opt) => output.info(`- ${opt}`));
  }

  async initialize(): Promise<void> {
    await this.config.initialize();
  }

  async save(): Promise<void> {
    await this.config.save();
  }
}