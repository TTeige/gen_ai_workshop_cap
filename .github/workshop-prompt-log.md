# Workshop Prompt Log

Append-only log for workshop prompt comparisons.

## Timestamp: 2026-03-09T00:00:00Z
### User Input
Add a readme explaining that the diffrerent initial structure for the challenges are in their respective branch

### Agent Reasoning (Brief)
- Determined the need for a README to clarify branch structure
- Created a README.md summarizing branch locations for challenge starting code
- Provided instructions for checking out branches and participating

### Summary
A new README.md was added to explain that each challenge's initial code is located in its respective branch. The README includes instructions for checking out branches and participating in the workshop. No existing files were modified; only a new file was created.

## Timestamp: 2026-03-10T00:02:00Z
### User Input
Now, lets add a button that creates one new type of boid - the infected hunter. The task of the infected hunters are to hunt down the infected boids. When the hunter gets close to an infected boid it eliminates the infected boid. Stop the infection-stopwatch when all the infected boids are hunted down - or when there is no more healthy boids left

### Agent Reasoning (Brief)
- Added a `type: 'normal' | 'infected' | 'hunter'` field to `Boid`, replacing the `infected: boolean` flag, to cleanly represent the three boid roles
- Implemented `updateHunterBoid` with a seek-force toward the nearest infected boid (1.4× speed, 3× steer force) and per-frame proximity kill logic that removes infected boids from the array
- Extended the outcome model with `'all_hunted'` vs `'all_infected'` to distinguish how the stopwatch ended, reflected in different overlay text and colors

### Summary
An "Add Hunter" button (red-styled) was added to the Infection panel. Hunters are orange-red boids that actively seek and destroy infected boids within the infection radius each frame. The stopwatch now stops under two conditions: hunters eliminate all infected boids ("🏹 Infection cleared!" in orange) or all healthy boids are infected ("✓ All infected!" in green). Reset Defaults now also removes all hunters and clears infection state.

## Timestamp: 2026-03-10T00:01:00Z
### User Input
Let's add a button that adds one "infected" boid (make it green colored). Other boids gets infected if they come to close to the infected boid. When a boid gets infected, turn the color of the boid green. Also, when the infected boid is added, start a stopwatch and track how long it takes to infect all boids.

### Agent Reasoning (Brief)
- Added `infected: boolean` to the `Boid` type and `infectionRadius` to `BoidsConfig` so infection is a first-class simulation property
- Implemented infection spreading in the animation loop (per-frame proximity check between infected and healthy boids) and a `setInterval`-based stopwatch to avoid 60fps React re-renders
- Added an "Add Infected Boid" button in the controls panel, a canvas overlay showing live timer + progress, and green color theming for infected boids

### Summary
Clicking "Add Infected Boid" resets all infection state, infects one random boid (rendered green), starts a stopwatch, and checks each frame whether healthy boids are within the configurable infection radius of any infected boid. A centered overlay on the canvas shows the live elapsed time and infected count, switching to a "✓ All infected!" state with the final time once the entire flock is infected. The infection radius is configurable via a slider in the new Infection section of the control panel.

## Timestamp: 2026-03-10T00:00:00Z
### User Input
Do what you must to implement a visualization of boids flocking in the html canvas that is already defined. It should support customization of the attributes

### Agent Reasoning (Brief)
- Explored the existing React/Vite/TypeScript codebase and the bare canvas component
- Implemented the full three-rule boids algorithm (separation, alignment, cohesion) with toroidal/bounce edge handling directly in App.tsx
- Added a collapsible side panel with sliders and a dropdown to control all simulation parameters at runtime

### Summary
`App.tsx` was rewritten to contain the complete boids flocking simulation using `requestAnimationFrame` on the existing `<canvas>` element. Boids are driven by the classic separation, alignment, and cohesion rules, all of which are tunable at runtime via a styled side panel added to `App.css`. Customizable parameters include boid count, max speed, max force, per-rule radius and weight, visual size, trail length, and edge wrapping/bouncing behavior.
