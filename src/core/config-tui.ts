// Blessed-based TUI for editing neorwc configuration
// Sidebar navigation + dynamic content panel + keyboard shortcuts + mouse support

import { createRequire } from "node:module";
const __blessedRequire = createRequire(import.meta.url);
// Force bun --compile to include blessed + all widget modules
const blessed = __blessedRequire("blessed");
__blessedRequire("blessed/lib/widgets/node");
__blessedRequire("blessed/lib/widgets/screen");
__blessedRequire("blessed/lib/widgets/element");
__blessedRequire("blessed/lib/widgets/box");
__blessedRequire("blessed/lib/widgets/text");
__blessedRequire("blessed/lib/widgets/line");
__blessedRequire("blessed/lib/widgets/scrollablebox");
__blessedRequire("blessed/lib/widgets/scrollabletext");
__blessedRequire("blessed/lib/widgets/bigtext");
__blessedRequire("blessed/lib/widgets/list");
__blessedRequire("blessed/lib/widgets/form");
__blessedRequire("blessed/lib/widgets/input");
__blessedRequire("blessed/lib/widgets/textarea");
__blessedRequire("blessed/lib/widgets/textbox");
__blessedRequire("blessed/lib/widgets/button");
__blessedRequire("blessed/lib/widgets/progressbar");
__blessedRequire("blessed/lib/widgets/filemanager");
__blessedRequire("blessed/lib/widgets/checkbox");
__blessedRequire("blessed/lib/widgets/radioset");
__blessedRequire("blessed/lib/widgets/radiobutton");
__blessedRequire("blessed/lib/widgets/prompt");
__blessedRequire("blessed/lib/widgets/question");
__blessedRequire("blessed/lib/widgets/message");
__blessedRequire("blessed/lib/widgets/loading");
__blessedRequire("blessed/lib/widgets/listbar");
__blessedRequire("blessed/lib/widgets/log");
__blessedRequire("blessed/lib/widgets/table");
__blessedRequire("blessed/lib/widgets/listtable");

import type { Widgets } from "blessed";
import { getModelsByProvider } from "modelpedia";
import { loadMergedConfig, saveTUIConfig } from "./config-manager.ts";
import { IGNORE_PATTERNS } from "./config.ts";



const PROVIDERS = ["google", "openai", "anthropic", "deepseek", "mistral", "cohere", "ollama"];

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  cohere: "Cohere",
  ollama: "Ollama (Local)",
};

const MENU_ITEMS = [
  "AI Provider",
  "AI Model",
  "API Keys",
  "Save & Exit",
];

export async function openConfigTUI(): Promise<void> {
  // Load current merged config from disk
  const merged = await loadMergedConfig();

  // Mutable working copy the TUI edits in-memory
  const cfg = {
    provider: merged.provider,
    model: merged.model,
    ctx: merged.ctx,
    googleKey: merged.apiKeys.google ?? "",
    openaiKey: merged.apiKeys.openai ?? "",
    anthropicKey: merged.apiKeys.anthropic ?? "",
    deepseekKey: merged.apiKeys.deepseek ?? "",
    mistralKey: merged.apiKeys.mistral ?? "",
    cohereKey: merged.apiKeys.cohere ?? "",
    ignorePatterns: merged.ignorePatterns.join("\n"),
  };

  // Cache models from modelpedia keyed by provider name
  const modelCache = new Map<string, Array<{ id: string; ctx: number }>>();

  function getModelsForProvider(provider: string): Array<{ id: string; ctx: number }> {
    const cached = modelCache.get(provider);
    if (cached) return cached;
    try {
      const models = getModelsByProvider(provider) as Array<{ id: string; context_window?: number }>;
      const result = models
        .filter((m) => m.context_window)
        .map((m) => ({ id: m.id, ctx: m.context_window! }))
        .sort((a, b) => b.ctx - a.ctx);
      modelCache.set(provider, result);
      return result;
    } catch {
      return [];
    }
  }

  return new Promise<void>((resolve) => {
    // ─── Screen setup ───
    const screen = blessed.screen({
      smartCSR: true,
      title: "neorwc Configuration",
      cursor: { artificial: true, blink: true, shape: "block", color: null } as any,
    });

    // Enable mouse (safe fallback on terminals that don't support it)
    try { screen.program.enableMouse(); } catch { /* no-op */ }

    // ─── Title bar ───
    blessed.box({
      parent: screen,
      top: 0, left: 0, width: "100%", height: 1,
      content: " neorwc Configuration ",
      style: { bold: true, fg: "cyan" },
    });

    // ─── Status bar (bottom) ───
    blessed.box({
      parent: screen,
      bottom: 0, left: 0, width: "100%", height: 1,
      content: " \u2191\u2193:Menu  Enter:Select  Esc:Back  i:Ignore  C-c:Quit",
      style: { fg: "white", bg: "blue" },
    });

    // ─── Left sidebar: menu list ───
    const menuList = blessed.list({
      parent: screen,
      top: 1, left: 0, width: 22, bottom: 1,
      keys: true, vi: true, mouse: true,
      tags: true,
      items: MENU_ITEMS.map((item, i) => (i === 0 ? "\u25b6 ".concat(item) : "  ".concat(item))),
      style: {
        selected: { fg: "white", bg: "blue" },
        item: { fg: "white" },
      },
      border: { type: "line", fg: "cyan" } as any,
    });

    // ─── Right content panel ───
    const contentPanel = blessed.box({
      parent: screen,
      top: 1, left: 22, width: "100%-22", bottom: 1,
      border: { type: "line", fg: "cyan" } as any,
      scrollable: true, alwaysScroll: true,
    });

    // ─── Helpers ───

    // Remove all children from content panel
    function clearContent(): void {
      for (const child of [...contentPanel.children]) {
        (child as Widgets.BlessedElement).detach();
      }
    }

    // Refresh screen with focus on the menu list
    function renderWithMenuFocus(): void {
      menuList.focus();
      screen.render();
    }

    // Set a short info line at the top of the content panel
    function infoLine(text: string): Widgets.BoxElement {
      return blessed.box({
        parent: contentPanel,
        top: 0, left: 1, width: "100%-2", height: 1,
        content: text,
        style: { bold: true, fg: "cyan" },
      });
    }

    // ─── Menu selection handler ───
    let currentViewIndex = 0;
    let navigating = false;

    menuList.on("select", (_item: any, index: number) => {
      if (navigating) return;
      navigating = true;
      currentViewIndex = index;
      switch (index) {
        case 0: showProviderPicker(); break;
        case 1: showModelPicker(); break;
        case 2: showApiKeysInput(); break;
        case 3: handleSaveAndExit(); break;
      }
      navigating = false;
    });

    // ─── View 0: AI Provider list ───
    function showProviderPicker(): void {
      clearContent();
      infoLine(" Select AI Provider:");

      const items = PROVIDERS.map((p) => {
        const label = PROVIDER_LABELS[p] ?? p;
        return "".concat(p === cfg.provider ? "\u25c9" : "\u25cb", " ", p, "  ", label);
      });

      const list = blessed.list({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: PROVIDERS.length + 2,
        keys: true, vi: true, mouse: true,
        items,
        style: {
          selected: { fg: "white", bg: "green" },
          item: { fg: "white" },
        },
      });

      list.on("select", (_item: any, idx: number) => {
        cfg.provider = PROVIDERS[idx];
        const models = getModelsForProvider(cfg.provider);
        if (models.length > 0) cfg.model = models[0].id;
        if (providerEsc) (screen.unkey as any)("escape", providerEsc);
        currentViewIndex = 1;
        updateSidebar();
        showModelPicker();
      });

      const providerEsc = () => {
        if (providerEsc) (screen.unkey as any)("escape", providerEsc);
        renderWithMenuFocus();
      };
      screen.key(["escape"], providerEsc);

      list.focus();
      screen.render();
    }

    // ─── View 1: AI Model list from modelpedia ───
    let modelEsc: (() => void) | undefined;

    function showModelPicker(): void {
      clearContent();
      const models = getModelsForProvider(cfg.provider);

      infoLine(" Models for ".concat(cfg.provider, ":"));

      const modelEscHandler = () => {
        if (modelEsc) (screen.unkey as any)("escape", modelEsc);
        renderWithMenuFocus();
      };
      modelEsc = modelEscHandler;
      screen.key(["escape"], modelEsc);

      if (models.length === 0) {
        blessed.box({
          parent: contentPanel,
          top: 2, left: 2, width: "100%-4", height: 1,
          content: " (No models found in modelpedia for \"".concat(cfg.provider, "\")  [Esc to go back]"),
          style: { fg: "yellow" },
        });
        screen.render();
        return;
      }

      const padLen = Math.max(...models.map((m) => m.id.length)) + 2;
      const items = models.map((m) => {
        const sel = m.id === cfg.model ? "\u25c9" : "\u25cb";
        return sel + " " + m.id.padEnd(padLen) + " (" + m.ctx.toLocaleString() + " tokens)";
      });

      const list = blessed.list({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: (screen.height as number) - 8,
        keys: true, vi: true, mouse: true,
        items,
        style: {
          selected: { fg: "white", bg: "green" },
          item: { fg: "white" },
        },
      });

      list.on("select", (_item: any, idx: number) => {
        cfg.model = models[idx].id;
        if (modelEsc) (screen.unkey as any)("escape", modelEsc);
        if (cfg.provider === "ollama") {
          currentViewIndex = 3;
          updateSidebar();
          showPreviewScreen();
        } else {
          currentViewIndex = 2;
          updateSidebar();
          showApiKeysInput();
        }
      });

      list.focus();
      screen.render();
    }

    // ─── View 2: API Keys input (only for selected provider) ───
    function showApiKeysInput(): void {
      clearContent();

      const apiKeyConfig: Record<string, { label: string; env: string; value: string; setter: (v: string) => void }> = {
        google: {
          label: "Google API Key",
          env: "NEORWC_GOOGLE_KEY",
          value: cfg.googleKey,
          setter: (v) => { cfg.googleKey = v; },
        },
        openai: {
          label: "OpenAI API Key",
          env: "OPENAI_API_KEY",
          value: cfg.openaiKey,
          setter: (v) => { cfg.openaiKey = v; },
        },
        anthropic: {
          label: "Anthropic API Key",
          env: "ANTHROPIC_API_KEY",
          value: cfg.anthropicKey,
          setter: (v) => { cfg.anthropicKey = v; },
        },
        deepseek: {
          label: "DeepSeek API Key",
          env: "DEEPSEEK_API_KEY",
          value: cfg.deepseekKey,
          setter: (v) => { cfg.deepseekKey = v; },
        },
        mistral: {
          label: "Mistral API Key",
          env: "MISTRAL_API_KEY",
          value: cfg.mistralKey,
          setter: (v) => { cfg.mistralKey = v; },
        },
        cohere: {
          label: "Cohere API Key",
          env: "COHERE_API_KEY",
          value: cfg.cohereKey,
          setter: (v) => { cfg.cohereKey = v; },
        },
      };

      const entry = apiKeyConfig[cfg.provider];
      if (!entry) {
        currentViewIndex = 3;
        updateSidebar();
        showPreviewScreen();
        return;
      }

      infoLine(" ".concat(entry.label, " (saved to global config):"));

      blessed.box({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: 1,
        content: " Enter your ".concat(entry.label, " (").concat(entry.env, "):"),
        style: { fg: "white" },
      });

      const input = blessed.textbox({
        parent: contentPanel,
        top: 3, left: 2, width: "80%", height: 1,
        content: entry.value,
        censor: true,
        inputOnFocus: true,
        mouse: true,
        style: { fg: "white", bg: "black", focus: { bg: "blue" } },
      });

      input.on("submit", () => {
        entry.setter(input.value || input.content || "");
        currentViewIndex = 3;
        updateSidebar();
        showPreviewScreen();
      });

      input.on("cancel", () => {
        renderWithMenuFocus();
      });

      input.focus();
      screen.render();
    }

    // ─── Ignore Patterns popup (i key) ───
    function showIgnorePopup(): void {
      const overlay = blessed.box({
        parent: screen,
        top: "center", left: "center",
        width: "70%", height: "60%",
        border: { type: "line", fg: "cyan" },
        style: { bg: "black" },
        shadow: true,
      });

      blessed.box({
        parent: overlay,
        top: 0, left: 1, width: "100%-2", height: 1,
        content: " Ignore Patterns (one per line):",
        style: { bold: true, fg: "cyan" },
      });

      const defaultSnippet = IGNORE_PATTERNS.slice(0, 5).join(", ") + ", ...";
      blessed.box({
        parent: overlay,
        top: 1, left: 1, width: "100%-2", height: 1,
        content: " Defaults: ".concat(defaultSnippet, " (").concat(String(IGNORE_PATTERNS.length), " total)"),
        style: { fg: "gray" },
      });

      const textarea = blessed.textarea({
        parent: overlay,
        top: 3, left: 1, width: "100%-2", height: "100%-5",
        content: cfg.ignorePatterns,
        inputOnFocus: true,
        mouse: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        style: { fg: "white", bg: "transparent", focus: { bg: "blue" } },
      });

      blessed.box({
        parent: overlay,
        bottom: 0, left: 1, width: "100%-2", height: 1,
        content: " Enter: Save & Close   Esc: Close",
        style: { fg: "gray" },
      });

      textarea.on("submit", () => {
        cfg.ignorePatterns = textarea.value || textarea.content || "";
        overlay.detach();
        screen.render();
      });

      textarea.on("cancel", () => {
        cfg.ignorePatterns = textarea.value || textarea.content || "";
        overlay.detach();
        screen.render();
      });

      textarea.focus();
      screen.render();
    }

    // ─── Preview screen: shows summary, Enter=save, Esc=back ───
    function showPreviewScreen(): void {
      clearContent();

      const patternList = cfg.ignorePatterns
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const keyEntries = [
        { label: "Google Key", val: cfg.googleKey },
        { label: "OpenAI Key", val: cfg.openaiKey },
        { label: "Anthropic Key", val: cfg.anthropicKey },
        { label: "DeepSeek Key", val: cfg.deepseekKey },
        { label: "Mistral Key", val: cfg.mistralKey },
        { label: "Cohere Key", val: cfg.cohereKey },
      ];
      const keyLines = keyEntries
        .filter((e) => e.val)
        .map((e) => "  ".concat(e.label, ":  ****").concat(e.val.slice(-4)));
      if (keyLines.length === 0) keyLines.push("  (no API keys set)");

      const lines = [
        " Configuration Preview",
        "",
        "  Provider:         ".concat(cfg.provider),
        "  Model:            ".concat(cfg.model),
        "  Context:          ".concat(cfg.ctx.toLocaleString(), " tokens"),
        ...keyLines,
        "  Ignore Patterns:  ".concat(String(patternList.length), " patterns"),
        "",
        "  [Enter] Save & Exit     [Esc] Go back and edit",
      ];

      blessed.box({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: lines.length + 1,
        content: lines.join("\n"),
        style: { fg: "green" },
      });

      screen.render();

      let handled = false;
      const enterHandler = () => {
        if (handled) return;
        handled = true;
        (screen.unkey as any)("enter", enterHandler);
        (screen.unkey as any)("escape", escHandler);
        performSave(patternList);
      };
      const escHandler = () => {
        if (handled) return;
        handled = true;
        (screen.unkey as any)("enter", enterHandler);
        (screen.unkey as any)("escape", escHandler);
        renderWithMenuFocus();
      };
      screen.key(["enter"], enterHandler);
      screen.key(["escape"], escHandler);
    }

    // ─── Save then show success / error ───
    async function performSave(patternList: string[]): Promise<void> {
      clearContent();
      blessed.box({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: 2,
        content: " Saving...",
        style: { fg: "green" },
      });
      screen.render();

      try {
        await saveTUIConfig({
          provider: cfg.provider,
          model: cfg.model,
          ctx: cfg.ctx,
          googleKey: cfg.googleKey,
          openaiKey: cfg.openaiKey,
          anthropicKey: cfg.anthropicKey,
          deepseekKey: cfg.deepseekKey,
          mistralKey: cfg.mistralKey,
          cohereKey: cfg.cohereKey,
          ignorePatterns: patternList,
        });

        clearContent();
        blessed.box({
          parent: contentPanel,
          top: 2, left: 2, width: "100%-4", height: 3,
          content: " \u2714 Configuration saved successfully!\n\n Press any key to exit.",
          style: { fg: "green", bold: true },
        });
        screen.render();
        screen.once("keypress", () => {
          screen.destroy();
          resolve();
        });
      } catch (err) {
        clearContent();
        blessed.box({
          parent: contentPanel,
          top: 2, left: 2, width: "100%-4", height: 3,
          content: " \u2717 Error saving config: ".concat((err as Error).message, "\n\n Press any key to exit."),
          style: { fg: "red", bold: true },
        });
        screen.render();
        screen.once("keypress", () => {
          screen.destroy();
          resolve();
        });
      }
    }

    // ─── Save & Exit menu / S-s shortcut: show preview first ───
    function handleSaveAndExit(): void {
      showPreviewScreen();
    }

    // ─── Update sidebar menu items with current state ───
    function updateSidebar(): void {
      const labels = [
        "Provider: ".concat(cfg.provider.slice(0, 12)),
        "Model: ".concat(cfg.model.length > 14 ? cfg.model.slice(0, 11).concat("...") : cfg.model),
        "API Keys",
        "Save & Exit",
      ];
      (menuList.setItems as (items: string[]) => void)(labels.map((item, i) => {
        const prefix = i === currentViewIndex ? "\u25b6 " : "  ";
        const style = i === currentViewIndex ? "{bold}" : "";
        return prefix + style + item;
      }));
    }

    // ─── Global keyboard shortcuts ───
    screen.key(["i"], () => {
      showIgnorePopup();
    });

    screen.key(["C-c"], () => {
      screen.destroy();
      resolve();
    });

    // ─── Show initial view (Provider) ───
    updateSidebar();
    showProviderPicker();
  });
}
