// src/types/workflow-types.ts

import { TemplateDefinition } from '../templates/types';

export enum StepType {
    INTERNAL = 'internal',
    ACTION = 'action'
}

export interface ActionProgram {
    execute(input: Record<string, any>): Promise<Record<string, any>>;
}

export interface WorkflowStep {
    template?: TemplateDefinition;
    program?: ActionProgram;
    type: StepType;
    provider?: string;
    input?: Record<string, string | number | boolean>; // Updated to allow more types
    output: string | Record<string, string>;
}

export interface WorkflowDefinition {
    name: string;
    description?: string;
    version?: string;
    defaultProvider?: string;
    steps: WorkflowStep[];
}

export interface WorkflowExecutionResult {
    response: string | Record<string, any>;
    outputVariables: Record<string, any>;
}

export interface WorkflowExecutionContext {
    variables: Record<string, any>;
    results: Record<string, WorkflowExecutionResult>;
}