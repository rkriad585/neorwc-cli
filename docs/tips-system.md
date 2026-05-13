# The Tips System

To enhance user experience, neorwc includes a "Tip of the Day" system that displays a styled banner every time the CLI starts.

**Author:** RK Riad Khan ([rkriad585@gmail.com](mailto:rkriad585@gmail.com))  
**GitHub:** [github.com/rkriad585/neorwc-cli](https://github.com/rkriad585/neorwc-cli)

### How it Works
The system is located in `src/tips/`. It imports static JSON templates for **20+ categories**:
- **neorwc_tips:** CLI shortcuts and feature highlights
- **bun:** Performance tricks for the Bun runtime
- **git:** Best practices for version control
- **typescript:** Type-safety patterns
- **json:** JSON manipulation tips
- **nodejs:** Node.js / Bun runtime tips
- **cli:** Command-line interface tips
- **security:** Security best practices
- **performance:** Performance optimization tips
- **markdown:** Markdown formatting tips
- **design:** Software design principles
- **debugging:** Debugging techniques
- **testing:** Testing best practices
- **css:** CSS layout and styling tips
- **python:** Python development tips
- **docker:** Docker and container tips
- **linux:** Linux command-line tips
- **npm:** Package management tips
- **api:** API development tips
- **database:** Database query and design tips

Each category is a separate JSON file in `src/tips/tips_template/`. The system randomly picks a category and a tip from it.

### Visuals
The banner is rendered using `boxen` and `chalk`, displaying inside a rounded border box:
- **Title:** "neorwc" in cyan
- **Author:** RK Riad Khan
- **Version:** Current version from `.version` or build-time injection
- **Commit:** Short git commit hash
- **GitHub:** `rkriad585/neorwc-cli`
- **Tip:** A randomized tip message (italic, magenta)
- **Hint:** A helpful related command hint (dimmed)

### Startup Integration
The tip system is imported as a side-effect in `neorwc.ts` (line 4: `import "./src/tips/index.ts"`), ensuring the banner appears before any CLI processing begins. The `index.ts` file calls `showTip()` immediately on import.

### Exports
The module (`src/tips/tips.ts`) exports:
- `showTip(category?)` — display a styled tip banner (random category by default)
- `getCategories()` — list all registered categories
- `loadTips(category)` — load tips for a specific category
- `resolveTip(category?)` — resolve a random category + tip + hint