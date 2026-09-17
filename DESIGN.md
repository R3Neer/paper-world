# PAPER WORLD — design contract

PAPER WORLD is a mobile time-tool interface built as one continuous three-dimensional scene. World clocks, timers, and the chrono occupy the same nine spatial slots and share the same block dimensions, perspective system, beveled construction, and interaction model.

## Spatial composition

The home scene is a 3 × 3 arrangement whose center block is the protagonist. Every block extends toward a common vanishing point. Saturation communicates depth: the central block is the most vivid, while distant blocks are progressively softer. Promoting a secondary block retracts the scene, routes the old and new protagonists through free spatial channels, and restores the other seven blocks to their original final positions.

The default arrangement exposes the complete product immediately: three distinct timer presets occupy the upper row, Madrid remains the central clock, and the chrono occupies the lower-center slot.

CHANGE is a persistent editing mode. The block faces sway as if their distant prism ends were flexible anchors while every prism also breathes gently in depth. The warm yellow background distinguishes replacement from the normal blue time-viewing context. Selecting a slot opens the corresponding catalog; completing a replacement returns to CHANGE. Direct double-click replacement returns to the normal scene, but its selector still uses the yellow replacement context.

Entering CHANGE retracts the button and reveals a separate BACK control plus a non-interactive beveled instruction plate. The blocks perform a short staggered depth pulse before settling into their editing sway. In the selector, the destination context and category navigation occupy two separate floating beveled surfaces; the recessed search surface is deliberately larger for touch use.

## Catalogs

CLOCKS and TIMERS are fixed, complete two-dimensional matrices embedded in the same perspective world. The normal catalog is toroidal: rows and columns wrap continuously, opening it puts the block being replaced in the center, and navigation always snaps to a block. CLOCKS retain circular longitude order, which makes east and west meet naturally, while latitude supplies the vertical ordering. TIMERS progress spatially by duration and include sub-minute presets plus a custom duration. Items already present in the main scene remain visible; choosing an occupied world clock swaps its slot with the block being replaced. CHRONO contains one large object and has no search field.

A non-empty search query intentionally leaves that model. City queries match city names rather than incidental substrings in country names. The query destroys the wrapped catalog and lays only its matches into a compact finite matrix, making the result boundary explicit. The result nearest to the camera's previous focal block becomes the new anchor and occupies the exact center; the remaining matches form concentric square rings around it. Clearing the query restores the complete wrapped matrix and recenters the current block.

All blocks share one depth response. Pointer or keyboard focus pushes the entire prism slightly away from the camera, so hover reads as physical recession rather than a two-dimensional scale effect. This applies in the home scene, CHANGE mode, and every catalog. During CHANGE, focus damps the selected prism's spring rotation but preserves both its continuous depth oscillation and the additional hover recession.

The timer display is an editing target only while its primary control says START. Pale blue hover feedback identifies that temporary editing affordance, and pressing it drives a short recessed digit pulse before the editor opens. Once the timer is running or paused, that invisible editing layer is removed and the same surface routes to the generic block interaction.

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
