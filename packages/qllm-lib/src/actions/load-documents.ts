import { readFile } from 'fs/promises';
import { ActionProgram } from '../types/workflow-types';

export class LoadDocumentFromTextFile implements ActionProgram {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    try {
      const filePath = input.path;
      const content = await readFile(filePath, 'utf-8');
      return { content };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erreur lors de la lecture du fichier: ${error.message}`);
      }
      throw new Error('Erreur inconnue lors de la lecture du fichier');
    }
  }
}