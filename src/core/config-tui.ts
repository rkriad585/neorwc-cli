// Blessed-based TUI for editing neorwc configuration
// Sidebar navigation + dynamic content panel + keyboard shortcuts + mouse support

import blessed from "blessed";
import type { Widgets } from "blessed";
import { getModelsByProvider } from "modelpedia";
import { loadMergedConfig, saveTUIConfig } from "./config-manager.ts";

const PROVIDERS = ["google", "openai", "ollama"];

// Human-readable provider labels
const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  openai: "OpenAI",
  ollama: "Ollama (Local)",
};

const MENU_ITEMS = [
  "AI Provider",
  "AI Model",
  "Context Window",
  "API Keys",
  "Ignore Patterns",
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
      content: " \u2191\u2193:Menu  Enter:Select  Esc:Back  C-c:Quit",
      style: { fg: "white", bg: "blue" },
    });

    // ─── Left sidebar: menu list ───
    const menuList = blessed.list({
      parent: screen,
      top: 1, left: 0, width: 22, bottom: 1,
      keys: true, vi: true, mouse: true,
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

    menuList.on("select", (_item: any, index: number) => {
      currentViewIndex = index;
      switch (index) {
        case 0: showProviderPicker(); break;
        case 1: showModelPicker(); break;
        case 2: showContextInput(); break;
        case 3: showApiKeysInput(); break;
        case 4: showIgnorePatterns(); break;
        case 5: handleSaveAndExit(); break;
      }
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
    function showModelPicker(): void {
      clearContent();
      const models = getModelsForProvider(cfg.provider);

      infoLine(" Models for ".concat(cfg.provider, ":"));

      if (models.length === 0) {
        blessed.box({
          parent: contentPanel,
          top: 2, left: 2, width: "100%-4", height: 1,
          content: " (No models found in modelpedia for \"".concat(cfg.provider, "\")"),
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
        currentViewIndex = 2;
        updateSidebar();
        showContextInput();
      });

      const modelEsc = () => {
        if (modelEsc) (screen.unkey as any)("escape", modelEsc);
        renderWithMenuFocus();
      };
      screen.key(["escape"], modelEsc);

      list.focus();
      screen.render();
    }

    // ─── View 2: Context Window text input ───
    function showContextInput(): void {
      clearContent();
      infoLine(" Context Window (tokens):");

      blessed.box({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: 1,
        content: " Current: ".concat(cfg.ctx.toLocaleString(), " tokens"),
        style: { fg: "green" },
      });

      const input = blessed.textbox({
        parent: contentPanel,
        top: 4, left: 2, width: 20, height: 1,
        content: String(cfg.ctx),
        inputOnFocus: true,
        mouse: true,
        style: { fg: "white", bg: "black", focus: { bg: "blue" } },
      });

      blessed.box({
        parent: contentPanel,
        top: 4, left: 23, width: 40, height: 1,
        content: " (min: 4096, max: 2097152, Enter to confirm)",
        style: { fg: "gray" },
      });

      input.on("submit", () => {
        const val = parseInt(input.value || input.content, 10);
        if (!isNaN(val) && val >= 4096) {
          cfg.ctx = Math.min(val, 2_097_152);
        }
        currentViewIndex = 3;
        updateSidebar();
        showApiKeysInput();
      });

      input.on("cancel", () => {
        renderWithMenuFocus();
      });

      input.focus();
      screen.render();
    }

    // ─── View 3: API Keys masked inputs ───
    function showApiKeysInput(): void {
      clearContent();
      infoLine(" API Keys (saved to global config):");

      blessed.box({
        parent: contentPanel,
        top: 2, left: 2, width: "100%-4", height: 1,
        content: " Google API Key (NEORWC_GOOGLE_KEY):",
        style: { fg: "white" },
      });

      const googleInput = blessed.textbox({
        parent: contentPanel,
        top: 3, left: 2, width: "80%", height: 1,
        content: cfg.googleKey,
        censor: true,
        inputOnFocus: true,
        mouse: true,
        style: { fg: "white", bg: "black", focus: { bg: "blue" } },
      });

      blessed.box({
        parent: contentPanel,
        top: 5, left: 2, width: "100%-4", height: 1,
        content: " OpenAI API Key (OPENAI_API_KEY):",
        style: { fg: "white" },
      });

      const openaiInput = blessed.textbox({
        parent: contentPanel,
        top: 6, left: 2, width: "80%", height: 1,
        content: cfg.openaiKey,
        censor: true,
        inputOnFocus: true,
        mouse: true,
        style: { fg: "white", bg: "black", focus: { bg: "blue" } },
      });

      let activeInput = 0;
      const inputs = [googleInput, openaiInput];
      let tabHandler: (ch: any, key: any) => void;

      // Tab between the two inputs
      screen.key(["tab"], tabHandler = (_ch: any, _key: any) => {
        activeInput = (activeInput + 1) % inputs.length;
        inputs[activeInput].focus();
        screen.render();
      });

      function cleanupApiTab(): void {
        (screen.unkey as unknown as (keys: string, handler: any) => void)("tab", tabHandler);
      }

      for (const inp of inputs) {
        inp.on("submit", () => {
          cfg.googleKey = googleInput.value || googleInput.content || "";
          cfg.openaiKey = openaiInput.value || openaiInput.content || "";
          cleanupApiTab();
          currentViewIndex = 4;
          updateSidebar();
          showIgnorePatterns();
        });
        inp.on("cancel", () => {
          cleanupApiTab();
          renderWithMenuFocus();
        });
      }

      googleInput.focus();
      screen.render();
    }

    // ─── View 4: Ignore Patterns textarea ───
    function showIgnorePatterns(): void {
      clearContent();
      infoLine(" Ignore Patterns (one per line):");

      const textarea = blessed.textarea({
        parent: contentPanel,
        top: 2, left: 1, width: "100%-2", height: "100%-4",
        content: cfg.ignorePatterns,
        inputOnFocus: true,
        mouse: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        style: { fg: "white", bg: "black", focus: { bg: "blue" } },
      });

      textarea.on("submit", () => {
        cfg.ignorePatterns = textarea.value || textarea.content || "";
        currentViewIndex = 5;
        updateSidebar();
        showPreviewScreen();
      });

      textarea.on("cancel", () => {
        renderWithMenuFocus();
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

      const lines = [
        " Configuration Preview",
        "",
        "  Provider:         ".concat(cfg.provider),
        "  Model:            ".concat(cfg.model),
        "  Context:          ".concat(cfg.ctx.toLocaleString(), " tokens"),
        "  Google Key:       ".concat(cfg.googleKey ? "****".concat(cfg.googleKey.slice(-4)) : "(not set)"),
        "  OpenAI Key:       ".concat(cfg.openaiKey ? "****".concat(cfg.openaiKey.slice(-4)) : "(not set)"),
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
        "Context: ".concat(cfg.ctx.toLocaleString()),
        "API Keys",
        "Ignore",
        "Save & Exit",
      ];
      (menuList.setItems as (items: string[]) => void)(labels.map((item, i) => (i === currentViewIndex ? "\u25b6 ".concat(item) : "  ".concat(item))));
    }

    // ─── Global keyboard shortcuts ───
    screen.key(["C-c"], () => {
      screen.destroy();
      resolve();
    });

    // ─── Show initial view (Provider) ───
    updateSidebar();
    showProviderPicker();
  });
}
