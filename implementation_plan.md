# Room Card Widget - Development Instructions

The goal of this task is to construct a **Room Card Widget** for ThingsBoard Extensions. The widget will be converted from raw HTML/CSS/React and will prominently feature a customizable click-action that opens a large popup dialog taking up 75% of the screen center with a white background.

Below is the step-by-step process we will follow for this. I will refer to this document continuously as we progress.

## Step 1: Ingest the Raw Design
**Action Items:**
- **USER:** Provide the raw HTML/CSS/React code representing the visual design of the Room Card.
- **ANTIGRAVITY:** Review the code structurally, map its CSS tokens into SCSS format, and map any React state/props into Angular `@Input()` and properties.

## Step 2: Establish the Boilerplate
**Action Items:**
- Create the component folder: `src/app/components/examples/room-card`
- Generate the following files:
    - [NEW] `room-card.component.ts` (Handles data binding and click logic)
    - [NEW] `room-card.component.html` (The ported HTML structure)
    - [NEW] `room-card.component.scss` (The ported CSS styles)

## Step 3: Implement the 75% Centered Dialog
**Action Items:**
- Create a secondary dialog component that will represent the pop-up modal.
  - [NEW] `room-card-dialog.component.ts / .html / .scss`
- In `room-card.component.ts`, inject Angular's `MatDialog` or the native ThingsBoard `customDialog` service.
- Hook up an `(click)` event listener on the core UI element to open the dialog component payload.
- Configure dialog styling (e.g., `width: '75%', height: '75%', panelClass: 'white-room-dialog'`) so it strictly takes 75% display space, centered, with a solid white background.

## Step 4: Register Components
**Action Items:**
- [MODIFY] `src/app/components/examples/examples.module.ts`: Declare and export the new components.
- [MODIFY] `src/app/components/examples/public-api.ts`: Export the components to the API layer so the custom ThingsBoard widget editor can invoke `<tb-room-card>`.

## User Review Required

> [!IMPORTANT]
> Since we are entering the formal design handover phase, **do these instructions capture your exact intentions?** If the steps are perfectly aligned with what you want:
> - **Please provide your React/HTML/CSS code now**, and I will kick off Step 1!
