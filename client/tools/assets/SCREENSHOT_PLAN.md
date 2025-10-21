# Screenshot Capture Plan

## Required Screenshots

1. **Initial State** (`initial_state.png`)

   - Empty prompt
   - Clean preview window
   - Export button disabled

2. **Prompt Entry** (`prompt_entry.png`)

   - Prompt text entered
   - Quick-insert suggestions visible
   - Generate button enabled

3. **Generation in Progress** (`generating.png`)

   - Loading indicator
   - Status message
   - Disabled controls

4. **Preview Display** (`preview_display.png`)

   - Generated content
   - Background image (if applicable)
   - Override controls available

5. **Export Process** (`export_process.png`)

   - Export progress indicator
   - Status message
   - Download starting

6. **Error States** (`error_state.png`)
   - Error message example
   - Status indicator
   - Recovery options

## Capture Process

1. Use browser dev tools to set viewport size:

   - Width: 1200px
   - Height: 800px

2. Ensure clean state between captures:

   - Clear any generated content
   - Reset UI state
   - Clear browser cache if needed

3. Capture with browser's screenshot tool:

   - Full page capture
   - Element-specific capture for details

4. Post-processing:
   - Crop to relevant areas
   - Highlight important features
   - Add annotations if needed

## Diagram Requirements

1. **User Flow Diagram**

   - Show interaction sequence
   - Include decision points
   - Highlight state transitions

2. **Component Layout**

   - Show spatial relationship
   - Indicate interaction zones
   - Mark dynamic areas

3. **Data Flow**
   - Show store updates
   - API communication
   - State transitions

## Storage

All assets will be stored in the repository under the automation package:

- Screenshots: `client/tools/assets/screenshots/`
- Diagrams: `client/tools/assets/diagrams/`

## Integration

Update USER_INTERACTION_GUIDE.md to include:

- Screenshot references
- Flow diagrams
- Interaction annotations
