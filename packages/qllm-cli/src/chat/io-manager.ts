// packages/qllm-cli/src/chat/io-manager.ts
import readline from "readline";
import kleur from "kleur";
import { getBorderCharacters, table } from "table";
import { createSpinner } from "nanospinner";

interface Spinner {
  start: () => void;
  stop: () => void;
  success: (options: { text: string }) => void;
  error: (options: { text: string }) => void;
}

export class IOManager {
  private rl: readline.Interface;
  private currentSpinner: Spinner | null = null;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  getUserInput(prompt: string, callback: (input: string) => void): void {
    this.rl.question(this.colorize(prompt, "green"), (input) => {
      callback(input);
    });
  }

  displayUserMessage(message: string): void {
    this.displayInfo(this.colorize(`You: ${message}`, "green"));
  }

  displayAssistantMessage(message: string): void {
    this.displayInfo(this.colorize(`Assistant: ${message}`, "blue"));
  }

  displaySystemMessage(message: string): void {
    this.displayInfo(this.colorize(`System: ${message}`, "yellow"));
  }

  displayError(message: string): void {
    console.error(this.colorize(`✖ ${message}`, "red"));
  }

  displaySuccess(message: string): void {
    console.log(this.colorize(`✔ ${message}`, "green"));
  }

  displayWarning(message: string): void {
    console.warn(this.colorize(`⚠ ${message}`, "yellow"));
  }

  displayInfo(message: string): void {
    console.log(message);
  }

  displayTable(headers: string[], data: string[][]): void {
    const tableData = [headers.map((h) => this.colorize(h, "cyan")), ...data];
    console.log(
      table(tableData, {
        border: getBorderCharacters("norc"),
        columnDefault: {
          paddingLeft: 0,
          paddingRight: 1,
        },
        drawHorizontalLine: () => false,
      })
    );
  }

  displayList(items: string[]): void {
    items.forEach((item) => this.displayInfo(`• ${item}`));
  }

  clearLine(): void {
    process.stdout.write("\r\x1b[K");
  }

  newLine(): void {
    console.log();
  }

  close(): void {
    this.rl.close();
  }

  createSpinner(message: string): Spinner {
    const spinner = createSpinner(message);
    this.currentSpinner = spinner;
    return spinner;
  }

  stopSpinner(): void {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }
  }

  write(text: string): void {
    process.stdout.write(text);
  }

  displayConversationList(
    conversations: { id: string; createdAt: Date }[]
  ): void {
    this.displayInfo("Conversations:");
    conversations.forEach((conv, index) => {
      this.displayInfo(
        `${index + 1}. ID: ${
          conv.id
        }, Created: ${conv.createdAt.toLocaleString()}`
      );
    });
  }

  displayConversationDetails(
    id: string,
    messages: { role: string; content: string }[]
  ): void {
    this.displayInfo(`Conversation ${id}:`);
    messages.forEach((msg, index) => {
      const roleColor = msg.role === "user" ? "green" : "blue";
      this.displayInfo(
        `${index + 1}. ${this.colorize(msg.role, roleColor)}: ${msg.content}`
      );
    });
  }

  promptForConversationSelection(callback: (input: string) => void): void {
    this.getUserInput(
      "Enter conversation number to select (or 'c' to cancel): ",
      callback
    );
  }

  promptForConversationDeletion(callback: (input: string) => void): void {
    this.getUserInput(
      "Enter conversation number to delete (or 'c' to cancel): ",
      callback
    );
  }

  confirmAction(message: string, callback: (confirmed: boolean) => void): void {
    this.getUserInput(`${message} (y/n): `, (input) => {
      callback(input.toLowerCase() === "y");
    });
  }

  colorize(text: string, color: string): string {
    switch (color) {
      case "green":
        return kleur.green(text);
      case "blue":
        return kleur.blue(text);
      case "yellow":
        return kleur.yellow(text);
      case "red":
        return kleur.red(text);
      case "cyan":
        return kleur.cyan(text);
      default:
        return text;
    }
  }

  displayGroupedInfo(title: string, items: string[]): void {
    this.displayInfo(this.colorize(`\n${title}:`, "yellow"));
    items.forEach((item) => this.displayInfo(`  ${item}`));
  }

  displayTitle(title: string): void {
    console.log(this.colorize(title, "cyan"));
  }

  displayCodeBlock(code: string, language?: string): void {
    const formattedCode = language ? this.colorize(code, "cyan") : code;
    console.log(this.colorize("```" + (language || ""), "gray"));
    console.log(formattedCode);
    console.log(this.colorize("```", "gray"));
  }

  clear(): void {
    console.clear();
  }

  displaySectionHeader(header: string): void {
    console.log(kleur.bold().yellow(`\n${header}`));
  }
}
