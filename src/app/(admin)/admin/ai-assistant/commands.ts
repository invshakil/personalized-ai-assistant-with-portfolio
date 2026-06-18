// Slash commands available in the AI chat input. `/property` and `/finance`
// scope the assistant to one module's tools for the turn (see SCOPE_RE in
// AiAssistantPage); they are stripped from the message before it reaches the
// model. Keep this list in sync with the ToolScope values the backend accepts.
export interface SlashCommand {
  /** Including the leading slash, e.g. "/property". */
  cmd: string;
  /** One-line description shown in the autocomplete menu. */
  desc: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: "/property", desc: "Focus on property — units, tenants, rent, building expenses" },
  { cmd: "/finance", desc: "Focus on finance — income, salaries, expenses, subscriptions" },
];

// Matches a slash command being typed as the first token (no whitespace yet),
// e.g. "/", "/pro", "/finance". Used to decide whether to show the menu.
export const SLASH_TYPING_RE = /^\/([a-z]*)$/i;
