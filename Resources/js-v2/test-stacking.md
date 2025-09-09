# Testing Vertical Stacking

## Test 1: Current approach (not working)
```mermaid
graph TD
    subgraph Entry[" "]
        main_init["main::init"]
        main_handleInput["main::handleInput"]
    end

    subgraph State[" "]
        state_loadData["state::loadData"]
        state_update["state::update"]
    end

    Entry -.-> State
    main_init --> state_loadData
```

## Test 2: Direct connection between subgraph nodes
```mermaid
graph TD
    subgraph Entry["Entry"]
        main_init["main::init"]
        main_handleInput["main::handleInput"]
    end

    subgraph State["State"]
        state_loadData["state::loadData"]
        state_update["state::update"]
    end

    main_init --> state_loadData
    main_handleInput --> state_update
```

## Test 3: Using explicit ranks (doesn't work in mermaid)
```mermaid
graph TD
    subgraph rank1
        main_init["main::init"]
    end
    
    subgraph rank2
        state_loadData["state::loadData"]
    end
    
    main_init --> state_loadData
```

## Test 4: No subgraphs, just visual grouping
```mermaid
graph TD
    main_init["MAIN: init"]
    main_handleInput["MAIN: handleInput"]
    main_setup["MAIN: setupListeners"]
    
    state_loadData["STATE: loadData"]
    state_update["STATE: update"]
    state_apply["STATE: applyFilters"]
    
    render_render["RENDER: render"]
    render_timeline["RENDER: renderTimeline"]
    
    main_init --> state_loadData
    main_handleInput --> state_update
    main_setup --> main_handleInput
    state_loadData --> render_render
    state_update --> render_render
    render_render --> render_timeline
```

## Test 5: Force ranking with ALL nodes connected
```mermaid
graph TD
    main_init["main::init"]
    main_handleInput["main::handleInput"]
    main_setup["main::setupListeners"]
    
    state_loadData["state::loadData"]
    state_update["state::update"]
    state_apply["state::applyFilters"]
    
    render_render["render::render"]
    render_timeline["render::renderTimeline"]
    
    %% Force every main to be above every state
    main_init --> state_loadData
    main_init --> state_update
    main_init --> state_apply
    
    main_handleInput --> state_loadData
    main_handleInput --> state_update  
    main_handleInput --> state_apply
    
    main_setup --> state_loadData
    main_setup --> state_update
    main_setup --> state_apply
    
    %% Force every state to be above every render
    state_loadData --> render_render
    state_loadData --> render_timeline
    
    state_update --> render_render
    state_update --> render_timeline
    
    state_apply --> render_render
    state_apply --> render_timeline
```