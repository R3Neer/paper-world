# PAPER WORLD — design contract

PAPER WORLD is a mobile time-tool interface built as one continuous three-dimensional scene. World clocks, timers, and the chrono occupy the same nine spatial slots and share the same block dimensions, perspective system, beveled construction, and interaction model.

## Spatial composition

The home scene is a 3 × 3 arrangement whose center block is the protagonist. Every block extends toward a common vanishing point. Saturation communicates depth: the central block is the most vivid, while distant blocks are progressively softer. Promoting a secondary block retracts the scene, routes the old and new protagonists through free spatial channels, and restores the other seven blocks to their original final positions.

The default arrangement exposes the complete product immediately: three distinct timer presets occupy the upper row, Madrid remains the central clock, and the chrono occupies the lower-center slot.

CHANGE is a persistent editing mode. The block faces sway as if their distant prism ends were flexible anchors. Selecting a slot opens the corresponding catalog; completing a replacement returns to CHANGE. Direct double-click replacement returns to the normal scene.

Entering CHANGE retracts the button and reveals a separate BACK control plus a non-interactive beveled instruction plate. The blocks perform a short staggered depth pulse before settling into their editing sway. In the selector, the destination context and category navigation occupy two separate floating beveled surfaces; the recessed search surface is deliberately larger for touch use.

## Catalogs

CLOCKS and TIMERS are complete two-dimensional matrices embedded in the same perspective world. Drag, wheel, keyboard, and search navigation always snap to a block center and never expose empty cells. CLOCKS are arranged schematically by longitude and latitude relative to the replaced city. TIMERS progress spatially by duration and include sub-minute presets plus a custom duration. CHRONO contains one large object and has no search field.

The vertical mode controls are stable relative to the current catalog: the neighboring category above moves the camera upward; the neighboring category below moves it downward. The catalog header and recessed search surface remain above scene geometry.

## Geometry and materials

Forms are simple except where depth communicates construction. Block bodies, front faces, clock recesses, digital segments, hands, hubs, lettering, and controls use geometric depth and restrained bevels. City, TIMER, and CHRONO labels are cut into their blocks. Analog hands use asymmetrical elongated diamond profiles with a raised center ridge.

The material direction is graphic paper rather than skeuomorphic cardboard. A custom cel shader quantizes light into discrete bands. Deep shadow receives cross-hatching; middle shadow receives sparse linear hatching and Ben-Day dots; bright faces retain a controlled paper grain. Longitudinal ink strokes are scarce, long, and variable. Light clock faces carry dots; colored surrounds do not.

The palette combines medium-vivid coral, turquoise, yellow, violet, green, and blue with softer distant variants. Timer blocks stay near white. Chrono blocks stay near black-violet with light wall strokes and a clearly readable recessed title. Pure black is avoided on clock hands and large material surfaces.

## Instruments and controls

Timers and chronos preserve the exact exterior dimensions of world-clock blocks. Their digital numerals are custom low-poly extrusions with beveled faces. Timers display `MM:SS`; the chrono adds hundredths. The custom timer editor always preserves the separator, fills missing positions with zero, normalizes seconds into minutes, selects all on entry, commits on Enter or blur, and saturates remaining time at total time.

Control buttons occupy the lower block margin and remain operable in secondary positions. START retracts into the body when paused and RESET/CONTINUE emerge at the lower left and right. Continuing reverses that physical sequence. Pointer hold visibly sinks a control without activating it; activation occurs on release. CHANGE hides all instrument controls by retracting them into their blocks.

## Accessibility and responsiveness

Every visible action has a semantic HTML control and an accessible label. Keyboard navigation, focus indication, status announcements, and reduced-motion behavior are supported. Desktop and tablet use the reusable iPhone canvas and zoom controls. Phones render the application directly without the surrounding device, background, or zoom interface.

World clocks use IANA time zones and current seasonal offsets. Saved layout and custom durations use `localStorage`; running elapsed state is intentionally session-only.
