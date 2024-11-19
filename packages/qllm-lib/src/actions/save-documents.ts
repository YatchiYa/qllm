import { writeFile, mkdir } from 'fs/promises';
import { ActionProgram } from '../types/workflow-types';
import path from 'path';

export class SaveDocument implements ActionProgram {
  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    try {
      const content = input.content;
      const outputDir = './output';
      const fileName = input.fileName || `result_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      const outputPath = path.join(outputDir, fileName);

      // Créer le dossier output s'il n'existe pas
      await mkdir(outputDir, { recursive: true });

      // Sauvegarder le contenu
      await writeFile(outputPath, content, 'utf-8');
      
      return { 
        path: outputPath,
        message: `Document sauvegardé avec succès dans ${outputPath}`
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erreur lors de la sauvegarde du fichier: ${error.message}`);
      }
      throw new Error('Erreur inconnue lors de la sauvegarde du fichier');
    }
  }
}