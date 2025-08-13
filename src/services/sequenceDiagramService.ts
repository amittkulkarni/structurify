import * as vscode from 'vscode';
import { callGroqApi, ValidationError } from './groqService';

interface SequenceParticipant {
    alias: string;
    description: string;
}
interface SequenceStep {
    from: string;
    to: string;
    label: string;
    type: 'sync' | 'async' | 'reply';
}
interface SequencePlan {
    participants: SequenceParticipant[];
    steps: SequenceStep[];
}

/**
 * Validates the structure of the JSON plan for a sequence diagram.
 * Throws a ValidationError if the structure is incorrect.
 * @param plan The parsed JSON object from the AI response.
 */
function validatePlan(plan: unknown): asserts plan is SequencePlan {
    if (!plan || typeof plan !== 'object') {
        throw new ValidationError('The AI response is not a valid object.');
    }

    const p = plan as Partial<SequencePlan>;

    if (!Array.isArray(p.participants) || !Array.isArray(p.steps)) {
        throw new ValidationError(
            'The AI response must contain "participants" and "steps" arrays.'
        );
    }

    // Validate each participant
    for (const participant of p.participants) {
        if (
            !participant ||
            typeof participant !== 'object' ||
            typeof participant.alias !== 'string' ||
            typeof participant.description !== 'string'
        ) {
            throw new ValidationError(
                'Invalid participant structure found in the AI response.'
            );
        }
    }

    // Validate each step
    const allowedStepTypes = ['sync', 'async', 'reply'];
    for (const step of p.steps) {
        if (
            !step ||
            typeof step !== 'object' ||
            typeof step.from !== 'string' ||
            typeof step.to !== 'string' ||
            typeof step.label !== 'string' ||
            typeof step.type !== 'string' ||
            !allowedStepTypes.includes(step.type)
        ) {
            throw new ValidationError(
                'Invalid step structure found in the AI response.'
            );
        }
    }
}


function buildMermaidSyntax(plan: SequencePlan): string {
    const lines = ['sequenceDiagram'];
    plan.participants.forEach(p => lines.push(`    participant ${p.alias} as ${p.description}`));
    plan.steps.forEach(s => {
        // Corrected arrow logic for Mermaid syntax
        const arrows = {
            sync: '->>',
            async: '->',
            reply: '-->>'
        };
        const arrow = arrows[s.type] || '->>';
        lines.push(`    ${s.from}${arrow}${s.to}: ${s.label}`);
    });
    return lines.join('\n');
}

export async function generateSequenceDiagram(
    code: string,
    token: vscode.CancellationToken
): Promise<string> {
    const systemPrompt = `You are an expert in code analysis. Convert the user's code into a JSON object for a sequence diagram.

- The JSON must have "participants" (actors or components) and "steps" (interactions).
- Each participant needs an "alias" (e.g., "A") and "description".
- Each step must have "from" and "to" aliases, a "label" for the action, and a "type" ('sync', 'async', 'reply').

CRITICAL: Respond with a single, valid JSON object only.`;

    const json = await callGroqApi(code, systemPrompt, token);
    const plan = JSON.parse(json);
    validatePlan(plan);
    return buildMermaidSyntax(plan);
}