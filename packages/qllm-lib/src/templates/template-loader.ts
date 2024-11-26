/**
 * @fileoverview Template Loader for QLLM Library
 * 
 * This module provides a robust and flexible system for loading template definitions
 * from various file formats. Key features include:
 * 
 * - Support for multiple file formats (JSON, YAML)
 * - Automatic content type detection
 * - Resolution of included content and dependencies
 * - Builder pattern support for template modification
 * - Error handling with detailed diagnostics
 * 
 * The loader handles all aspects of template loading, from file reading to
 * content resolution, ensuring templates are properly initialized before use.
 * 
 * @version 1.0.0
 * @module qllm-lib/templates
 * @since 2023
 * 
 * @example
 * ```typescript
 * // Load a template from YAML
 * const yamlTemplate = await TemplateLoader.load('templates/greeting.yaml');
 * 
 * // Load a template from JSON
 * const jsonTemplate = await TemplateLoader.load('templates/response.json');
 * 
 * // Load and modify a template using builder pattern
 * const builder = await TemplateLoader.loadAsBuilder('templates/base.yaml');
 * builder
 *   .setName('custom-template')
 *   .addVariable('user', { type: 'string', required: true })
 *   .setContent('Hello {{user}}!');
 * 
 * const customTemplate = builder.build();
 * ```
 * 
 * @see {@link TemplateDefinitionBuilder} for template modification
 * @see {@link TemplateManager} for template management
 */
// template-loader.ts
import { TemplateDefinitionWithResolvedContent } from './template-schema';
import { TemplateDefinitionBuilder } from './template-definition-builder';
import { loadContent, resolveIncludedContent } from '../utils/document/document-inclusion-resolver';
import fetch from 'node-fetch';
import { readFile } from 'fs/promises';

export class TemplateLoader {
  private static templateCache: Map<string, TemplateDefinitionWithResolvedContent> = new Map();

  static async load(source: string): Promise<TemplateDefinitionWithResolvedContent> {
    // Check cache first
    if (this.templateCache.has(source)) {
      return this.templateCache.get(source)!;
    }

    const content = await this.fetchContent(source);
    const builder = getBuilder(content);
    const template = builder.build();
    const resolvedContent = await resolveIncludedContent(template.content, source);
    
    const result = { ...template, content: resolvedContent };
    this.templateCache.set(source, result);
    return result;
  }

  static async loadAsBuilder(source: string): Promise<TemplateDefinitionBuilder> {
    const content = await this.fetchContent(source);
    const builder = getBuilder(content);
    const resolvedContent = await resolveIncludedContent(builder.build().content, source);

    return builder.setResolvedContent(resolvedContent);
  }

  private static async fetchContent(source: string): Promise<{ mimeType: string; content: string }> {
    if (source.startsWith('http')) {
      const url = this.parseTemplateUrl(source);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      const content = await response.text();
      const mimeType = response.headers.get('content-type') || this.guessMimeType(source);
      return { mimeType, content };
    } else {
      const content = await readFile(source, 'utf-8');
      const mimeType = this.guessMimeType(source);
      return { mimeType, content };
    }
  }

  private static parseTemplateUrl(url: string): string {
    if (url.startsWith('https://github.com/')) {
      return this.githubUrlToRaw(url);
    } else if (url.startsWith('https://s3.amazonaws.com/') || url.includes('.s3.amazonaws.com/')) {
      return this.parseS3Url(url);
    } else if (url.includes('drive.google.com')) {
      return this.parseGoogleDriveUrl(url);
    }
    return url;
  }

  private static githubUrlToRaw(url: string): string {
    return url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  private static parseS3Url(url: string): string {
    return encodeURI(url);
  }

  private static parseGoogleDriveUrl(url: string): string {
    let fileId = '';
    if (url.includes('/file/d/')) {
      fileId = url.split('/file/d/')[1].split('/')[0];
    } else if (url.includes('id=')) {
      fileId = new URL(url).searchParams.get('id') || '';
    }
    if (!fileId) {
      throw new Error('Invalid Google Drive URL format');
    }
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  private static guessMimeType(source: string): string {
    if (source.endsWith('.json')) return 'application/json';
    if (source.endsWith('.yaml') || source.endsWith('.yml')) return 'application/yaml';
    return 'application/yaml'; // default to yaml
  }

  static clearCache(): void {
    this.templateCache.clear();
  }
}

function getBuilder(content: { mimeType: string; content: string }): TemplateDefinitionBuilder {
  const { mimeType, content: contentString } = content;
  if (mimeType.includes('json')) {
    return TemplateDefinitionBuilder.fromJSON(contentString);
  }
  return TemplateDefinitionBuilder.fromYAML(contentString);
}