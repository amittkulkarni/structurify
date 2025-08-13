import * as vscode from 'vscode';
import { callGroqApi, ValidationError } from './groqService';

interface Entity {
    name: string;
    columns: { name: string; type: string; keys: ('PK' | 'FK')[] }[];
}
interface ErRelationship {
    from: string;
    to: string;
    cardinality: string;
    label: string;
}
interface ErPlan {
    entities: Entity[];
    relationships: ErRelationship[];
}

function sanitizePlan(plan: any): ErPlan {
    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '');

    plan.entities.forEach((entity: any) => {
        if (entity.name) {
            entity.name = sanitizeName(entity.name);
        }
    });

    plan.relationships.forEach((rel: any) => {
        if (rel.from) {
            rel.from = sanitizeName(rel.from);
        }
        if (rel.to) {
            rel.to = sanitizeName(rel.to);
        }
    });

    return plan;
}

/**
 * Validates the structure of the JSON plan for an ER diagram.
 * Throws a ValidationError if the structure is incorrect.
 * @param plan The parsed JSON object from the AI response.
 */
function validatePlan(plan: unknown): asserts plan is ErPlan {
    if (!plan || typeof plan !== 'object') {
        throw new ValidationError('The AI response is not a valid object.');
    }

    const p = plan as Partial<ErPlan>;

    if (!Array.isArray(p.entities) || !Array.isArray(p.relationships)) {
        throw new ValidationError(
            'The AI response must contain "entities" and "relationships" arrays.'
        );
    }

    // Validate each entity
    for (const entity of p.entities) {
        if (
            !entity ||
            typeof entity !== 'object' ||
            typeof entity.name !== 'string' ||
            !Array.isArray(entity.columns)
        ) {
            throw new ValidationError(
                'Invalid entity structure found in the AI response.'
            );
        }

        // Validate each column within the entity
        for (const col of entity.columns) {
            if (
                !col ||
                typeof col !== 'object' ||
                typeof col.name !== 'string' ||
                typeof col.type !== 'string' ||
                !Array.isArray(col.keys) ||
                !col.keys.every((k) => k === 'PK' || k === 'FK')
            ) {
                throw new ValidationError(
                    `Invalid column structure for entity "${entity.name}".`
                );
            }
        }
    }

    // Validate each relationship
    for (const rel of p.relationships) {
        if (
            !rel ||
            typeof rel !== 'object' ||
            typeof rel.from !== 'string' ||
            typeof rel.to !== 'string' ||
            typeof rel.cardinality !== 'string' ||
            typeof rel.label !== 'string'
        ) {
            throw new ValidationError(
                'Invalid relationship structure found in the AI response.'
            );
        }
    }
}


function buildMermaidSyntax(plan: ErPlan): string {
    const lines = ['erDiagram'];
    plan.entities.forEach(e => {
        lines.push(`    ${e.name} {`);
        e.columns.forEach(c => lines.push(`        ${c.type} ${c.name} ${c.keys.join(', ')}`));
        lines.push(`    }`);
    });
    plan.relationships.forEach(r => {
        lines.push(`    ${r.from} ${r.cardinality} ${r.to} : "${r.label}"`);
    });
    return lines.join('\n');
}

export async function generateErDiagram(
    code: string,
    token: vscode.CancellationToken
): Promise<string> {
    const systemPrompt = `You are an expert in database-related code analysis. Convert the user's code (e.g., ORM models, SQL schemas) into a JSON object for an ER diagram.

- The JSON must have "entities" and "relationships".
- Each entity "name" MUST be a single word (e.g., "Users", "OrderItems").
- Each relationship must have "from", "to", "cardinality" (e.g., "|o--||"), and a "label".

CRITICAL: Respond with a single, valid JSON object only. Entity names must not contain spaces or special characters.`;
    
    const json = await callGroqApi(code, systemPrompt, token);
    let plan = JSON.parse(json);
    plan = sanitizePlan(plan);
    validatePlan(plan);
    return buildMermaidSyntax(plan);
}