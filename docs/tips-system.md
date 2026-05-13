# The Tips System

To enhance user experience, Neorwc includes a "Tip of the Day" system that displays a styled banner every time the CLI starts.

### How it Works
The system is located in `src/tips/`. It imports static JSON templates for different categories:
- **Neorwc Tips:** CLI shortcuts and feature highlights.
- **Bun Tips:** Performance tricks for the Bun runtime.
- **Git Tips:** Best practices for version control.
- **TypeScript Tips:** Type-safety patterns.

### Visuals
The banner is rendered using `boxen` and `chalk`, displaying:
- Current Version and Git Commit Hash.
- Author information.
- A randomized tip and a helpful command hint.

This system is imported as a side-effect in `neorwc.ts`, ensuring it appears before any heavy processing begins.

written by Neorwc