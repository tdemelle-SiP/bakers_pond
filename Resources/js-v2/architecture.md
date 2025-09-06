<!-- 
The mermaid chart should show:
- containers representing files
- nodes within those containers representing the functions in those files - all functions in the code should be in the chart
- connections between functions
-->

```mermaid
graph TD
    DOM["DOM Ready"] --> init
    User["User Input"] --> handleInput
    Refresh["Refresh Button"] --> init
    
    subgraph "main.js"
        init["init()"]
        buildLegend["buildLegend()"]
        clearContainers["clearContainers()"]
        setupListeners["setupListeners()"]
        handleInput["handleInput(type, providedData)"]
    end
    
    subgraph "state.js"
        loadData["loadData()"]
        update["update(type, data)"]
        getDefaultCases["getDefaultCases()"]
        checkIsolation["checkIsolation(type, target)"]
    end
    
    subgraph "render.js"
        render["render(state)"]
        updateControls["updateControls(state)"]
        renderTimeline["renderTimeline(state)"]
        clearTimelineContainers["clearTimelineContainers()"]
    end
    
    %% Main.js connections
    init --> clearContainers
    clearContainers --> buildLegend
    buildLegend --> setupListeners
    setupListeners --> loadData
    handleInput --> update
    
    %% State.js connections
    loadData --> getDefaultCases
    loadData --> render
    update --> render
    
    %% Render.js connections
    render --> updateControls
    render --> renderTimeline
    renderTimeline --> clearTimelineContainers
```