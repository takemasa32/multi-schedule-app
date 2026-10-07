import { getMcpConfig } from './config';

export const MCP_TOOL_SCOPES = {
  list_my_events: 'daysynth.read',
  get_event: 'daysynth.read',
  get_my_answer: 'daysynth.read',
  get_my_schedule: 'daysynth.read',
  save_my_answer: 'daysynth.write',
  save_my_answer_to_schedule: 'daysynth.write',
  preview_my_schedule_update: 'daysynth.read',
  update_my_schedule: 'daysynth.write',
} as const;

export type McpToolName = keyof typeof MCP_TOOL_SCOPES;

export function getToolScope(name: string) {
  return Object.hasOwn(MCP_TOOL_SCOPES, name) ? MCP_TOOL_SCOPES[name as McpToolName] : undefined;
}

/** HTTPとツール結果で同じ認証要求を通知し、追加認可へ誘導する。 */
export function mcpChallenge(scope: string, error?: 'invalid_token' | 'insufficient_scope') {
  const config = getMcpConfig();
  const parts = [
    `resource_metadata="${config?.issuer}/.well-known/oauth-protected-resource/mcp"`,
    `scope="${scope}"`,
  ];
  if (error) {
    parts.push(`error="${error}"`);
    parts.push(
      `error_description="${error === 'invalid_token' ? 'Authentication required' : 'Additional permission required'}"`,
    );
  }
  return `Bearer ${parts.join(', ')}`;
}

export function toolSecurity(name: McpToolName) {
  return { securitySchemes: [{ type: 'oauth2', scopes: [MCP_TOOL_SCOPES[name]] }] };
}
