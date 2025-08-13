import * as vscode from 'vscode';
import { callGroqApi, ValidationError } from './groqService';

interface ClassDefinition {
    id: string;
    properties: string[];
    methods: string[];
}
interface Relationship {
    from: string;
    to: string;
    type: 'inheritance' | 'composition' | 'aggregation' | 'association';
    label?: string;
}
interface ClassPlan {
    classes: ClassDefinition[];
    relationships: Relationship[];
}

/**
 * Validates the structure of the JSON plan for a class diagram.
 * Throws a ValidationError if the structure is incorrect.
 * @param plan The parsed JSON object from the AI response.
 */
function validatePlan(plan: unknown): asserts plan is ClassPlan {
    if (!plan || typeof plan !== 'object') {
        throw new ValidationError('The AI response is not a valid object.');
    }

    const p = plan as Partial<ClassPlan>;

    if (!Array.isArray(p.classes) || !Array.isArray(p.relationships)) {
        throw new ValidationError(
            'The AI response must contain "classes" and "relationships" arrays.'
        );
    }

    // Validate each class definition
    for (const cls of p.classes) {
        if (
            !cls ||
            typeof cls !== 'object' ||
            typeof cls.id !== 'string' ||
            !Array.isArray(cls.properties) ||
            !Array.isArray(cls.methods)
        ) {
            throw new ValidationError(
                'Invalid class structure found in the AI response.'
            );
        }
        if (cls.properties.some((prop) => typeof prop !== 'string')) {
             throw new ValidationError('Class properties must be an array of strings.');
        }
        if (cls.methods.some((method) => typeof method !== 'string')) {
            throw new ValidationError('Class methods must be an array of strings.');
       }
    }

    // Validate each relationship
    const allowedRelationshipTypes = ['inheritance', 'composition', 'aggregation', 'association'];
    for (const rel of p.relationships) {
        if (
            !rel ||
            typeof rel !== 'object' ||
            typeof rel.from !== 'string' ||
            typeof rel.to !== 'string' ||
            typeof rel.type !== 'string' ||
            !allowedRelationshipTypes.includes(rel.type)
        ) {
            throw new ValidationError(
                'Invalid relationship structure found in the AI response.'
            );
        }
        if (rel.label !== undefined && typeof rel.label !== 'string') {
            throw new ValidationError('Relationship label, if provided, must be a string.');
        }
    }
}


function buildMermaidSyntax(plan: ClassPlan): string {
    const lines = ['classDiagram'];
    plan.classes.forEach(c => {
        lines.push(`    class ${c.id} {`);
        c.properties.forEach(p => lines.push(`        ${p}`));
        c.methods.forEach(m => lines.push(`        ${m}()`));
        lines.push(`    }`);
    });
    plan.relationships.forEach(r => {
        const arrows = {
            inheritance: '<|--',
            composition: '*--',
            aggregation: 'o--',
            association: '-->'
        };
        lines.push(`    ${r.from} ${arrows[r.type]} ${r.to}${r.label ? ` : "${r.label}"` : ''}`);
    });
    return lines.join('\n');
}

export async function generateClassDiagram(
    code: string,
    token: vscode.CancellationToken
): Promise<string> {
    const systemPrompt = `You are an expert in code analysis. Convert the user's code into a JSON object for a class diagram.

- The JSON must have "classes" and "relationships".
- Each class needs an "id", "properties" array, and "methods" array.
- Each relationship must have "from", "to", "type" ('inheritance', 'composition', 'aggregation', 'association'), and an optional "label".

CRITICAL: Respond with a single, valid JSON object only.`;
    
    const json = await callGroqApi(code, systemPrompt, token);
    const plan = JSON.parse(json);
    validatePlan(plan);
    return buildMermaidSyntax(plan);
}