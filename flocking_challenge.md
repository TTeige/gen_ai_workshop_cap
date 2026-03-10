# Flocking Playground

Build a small browser-based app where multiple agents move around and show flocking-like behavior.

## Goal

Create a runnable simulation where simple local rules create visible group movement.

## Requirements

Your app should:

- run locally
- display multiple moving agents
- update continuously
- make agents react to nearby agents
- include a way to reset the simulation
- include at least two controls for changing the behavior

## Notes

Keep it small. A simple working version is better than an ambitious incomplete one.

You do not need a perfect boids implementation. The goal is to create something interactive and interesting enough to compare across different prompt strategies.

## Good starting points

We have included a very small initial application that runs. See the flocking branch in the git repo. 
This renders a canvas with a ref so that we can use in a React app. You can build on this or start from scratch.

A typical approach could be:

1. render agents
2. move them over time
3. make them respond to nearby agents
4. add controls
5. add reset

## Optional ideas

If the basics work, you can add things like:

- trails
- mouse interaction
- obstacles
- colors
- presets
- different agent types
- 3D rendering
