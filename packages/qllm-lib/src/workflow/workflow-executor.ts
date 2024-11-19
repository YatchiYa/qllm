// src/workflow/workflow-executor.ts

import { EventEmitter } from 'events';
import { TemplateExecutor } from '../templates/template-executor';
import { WorkflowDefinition, WorkflowStep, WorkflowExecutionContext, WorkflowExecutionResult, StepType } from '../types/workflow-types';
import { LLMProvider } from '../types';
import { logger } from '../utils/logger';

export class WorkflowExecutor extends EventEmitter {
  private templateExecutor: TemplateExecutor;
  
  constructor() {
    super();
    this.templateExecutor = new TemplateExecutor();
    this.setupTemplateExecutorEvents();
  }

  private setupTemplateExecutorEvents() {
    this.templateExecutor.on('streamChunk', (chunk: string) => {
      this.emit('streamChunk', chunk);
    });

    this.templateExecutor.on('requestSent', (request: any) => {
      this.emit('requestSent', request);
    });
  }

  async executeWorkflow(
    workflow: WorkflowDefinition,
    providers: Record<string, LLMProvider>,
    initialInput: Record<string, any>
  ): Promise<Record<string, WorkflowExecutionResult>> {
    const context: WorkflowExecutionContext = {
      variables: { ...initialInput },
      results: {}
    };

    logger.info(`Executing workflow: ${workflow.name}`);

    for (const [index, step] of workflow.steps.entries()) {
      this.emit('stepStart', step, index);
      logger.info(`Step ${index + 1}: ${step.template?.name || step.program?.constructor.name}`);

      try {
        const resolvedInput = await this.resolveStepInputs(step.input || {}, context);
        let executionResult: WorkflowExecutionResult;

        if (step.type === StepType.ACTION && step.program) {
          const result = await step.program.execute(resolvedInput);
          executionResult = {
            response: JSON.stringify(result),
            outputVariables: result
          };
        } else if (step.type === StepType.INTERNAL && step.template) {
          const provider = providers[step.provider || workflow.defaultProvider || ''];
          if (!provider) {
            throw new Error(`Provider not found for step ${index + 1}`);
          }
          executionResult = await this.executeTemplateStep(step, provider, resolvedInput);
        } else {
          throw new Error(`Invalid step configuration at index ${index}`);
        }

        this.updateContext(context, step, executionResult);
        this.emit('stepComplete', step, index, executionResult);
        logger.info(`Completed step ${index + 1}`);

      } catch (error) {
        this.emit('stepError', step, index, error as Error);
        throw error;
      }
    }

    return context.results;
  }

  private async executeTemplateStep(
    step: WorkflowStep,
    provider: LLMProvider,
    resolvedInput: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    const result = await this.templateExecutor.execute({
      template: step.template!,
      provider,
      variables: resolvedInput,
      stream: true
    });

    return {
      response: result.response,
      outputVariables: result.outputVariables
    };
  }

  private resolveTemplateVariables(
    value: string, 
    context: Record<string, any>
  ): string {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      return context[key.trim()] || '';
    });
  }

  private async resolveStepInputs(
    inputs: Record<string, string | number | boolean>,
    context: WorkflowExecutionContext
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string') {
        if (value.startsWith('$')) {
          // Handle reference to previous step output
          const varName = value.slice(1);
          resolved[key] = context.results[varName]?.response || 
                         context.results[varName]?.outputVariables || 
                         context.results[varName];
        } else if (value.match(/\{\{.*\}\}/)) {
          // Handle template variables
          resolved[key] = this.resolveTemplateVariables(value, context.variables);
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  private updateContext(
    context: WorkflowExecutionContext,
    step: WorkflowStep,
    executionResult: WorkflowExecutionResult
  ) {
    if (typeof step.output === 'string') {
      context.results[step.output] = executionResult;
    } else {
      Object.entries(step.output).forEach(([key, varName]) => {
        if (typeof varName === 'string') {
          context.results[varName] = executionResult.outputVariables[key];
        }
      });
    }
  }
}