## Combined Chart (Main + Detail)

This chart combines the main architecture with all user input details in a single view.

```mermaid
graph TD
    subgraph "inputs"
        DOM["DOM<br/>Ready"]
        RefreshBtn["Refresh<br/>Button"]:::userInput
        DateFilterBtn["Date<br/>Filter"]:::userInput
        ResetBtn["Reset"]:::userInput
        ScaleSlider["Scale<br/>Slider"]:::userInput
        FitCheckbox["Fit to<br/>Window"]:::userInput
        CaseDropdownBtn["Case<br/>Filter"]:::userInput
        CaseCheckbox["Case<br/>Check"]:::userInput
        SelectAllBtn["Select<br/>All"]:::userInput
        ClearAllBtn["Clear<br/>All"]:::userInput
        EmojiCheckbox["Emoji<br/>Toggle"]:::userInput
    end
    
    subgraph "main.js"
        init["init()"]:::initStyle
        buildLegend["buildLegend()"]
        createEmojiCell["createEmojiCell() (inside buildLegend)"]
        clearContainers["clearContainers()"]
        setupListeners["setupListeners()"]:::setupStyle
        handleInput["handleInput(type, providedData)"]:::handleInputStyle
        dropdownToggle["dropdown toggle (inline)"]
    end
    
    subgraph "state.js"
        loadData["loadData()"]
        getDefaultCases["getDefaultCases()"]
        update["update(type, data)"]:::updateStyle
        checkIsolation["checkIsolation(type, target)"]
        updateDateFilter["case 'dateFilter'"]
        updateScale["case 'scale'"]
        updateFit["case 'fit'"]
        updateReset["case 'reset'"]
        updateCaseToggle["case 'caseToggle'"]
        updateEmojiToggle["case 'emojiToggle'"]
    end
    
    subgraph "render.js"
        render["render(state)"]:::renderStyle
        updateControls["updateControls(state)"]:::updateControlsStyle
        renderTimeline["renderTimeline(state)"]:::renderTimelineStyle
        clearTimelineContainers["clearTimelineContainers()"]
    end
    
    %% Input connections
    DOM --> init
    RefreshBtn --> init
    DateFilterBtn --> handleInput
    ResetBtn --> handleInput
    ScaleSlider --> handleInput
    FitCheckbox --> handleInput
    CaseDropdownBtn --> dropdownToggle
    CaseCheckbox --> handleInput
    SelectAllBtn --> handleInput
    ClearAllBtn --> handleInput
    EmojiCheckbox --> handleInput
    
    %% Main.js connections
    init --> clearContainers
    clearContainers --> buildLegend
    buildLegend --> createEmojiCell
    buildLegend --> setupListeners
    setupListeners --> loadData
    handleInput --> update
    
    %% State.js connections
    loadData --> getDefaultCases
    loadData --> render
    update --> render
    update --> updateDateFilter
    update --> updateScale
    update --> updateFit
    update --> updateReset
    update --> updateCaseToggle
    update --> updateEmojiToggle
    
    %% Switch cases to render
    updateDateFilter --> render
    updateScale --> render
    updateFit --> render
    updateReset --> render
    updateCaseToggle --> render
    updateEmojiToggle --> render
    
    %% Render.js connections
    render --> updateControls
    render --> renderTimeline
    renderTimeline --> clearTimelineContainers
    
    classDef userInput fill:#87ceeb,stroke:#333,stroke-width:3px
    classDef initStyle fill:#ffd700,stroke:#333,stroke-width:2px
    classDef handleInputStyle fill:#ff6b6b,stroke:#333,stroke-width:2px
    classDef setupStyle fill:#4ecdc4,stroke:#333,stroke-width:2px
    classDef updateStyle fill:#95e77e,stroke:#333,stroke-width:2px
    classDef renderStyle fill:#dda0dd,stroke:#333,stroke-width:2px
    classDef updateControlsStyle fill:#f4a460,stroke:#333,stroke-width:2px
    classDef renderTimelineStyle fill:#ffa07a,stroke:#333,stroke-width:2px
```

## Complexity Assessment

The combined chart shows:
- **10 user input buttons** at the top
- **All functions** from the three files
- **All switch cases** in the update function
- **All connections** between components

While more complex than the separated charts, it's still readable because:
1. Color coding helps distinguish user inputs (blue) from functions
2. File boundaries (subgraphs) maintain organizational clarity  
3. The flow pattern is still clear: inputs → handleInput → update → render

However, the **separated two-chart approach** is likely better for documentation because:
- The main chart shows the overall architecture cleanly
- The detail chart focuses specifically on user input handling
- Readers can choose their level of detail