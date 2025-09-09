# Mermaid Layout Experiments

## Test 1: Basic TD with subgraphs
```mermaid
graph TD
    subgraph A["File A"]
        A1["Function 1"]
        A2["Function 2"]
    end
    
    subgraph B["File B"]
        B1["Function 1"]
        B2["Function 2"]
    end
    
    subgraph C["File C"]
        C1["Function 1"]
        C2["Function 2"]
    end
    
    A1 --> B1
    B1 --> C1
```

## Test 2: Without subgraphs (grouped visually)
```mermaid
graph TD
    A1["emoji-config::getConfig"]
    A2["emoji-config::getArray"]
    
    B1["main::init"]
    B2["main::handleInput"]
    
    C1["state::loadData"]
    C2["state::update"]
    
    D1["render::render"]
    D2["render::renderTimeline"]
    
    B1 --> C1
    C1 --> D1
    B2 --> C2
    C2 --> D1
```

## Test 3: Using clustering without subgraphs
```mermaid
graph TD
    %% Utility layer
    emoji1[emoji-config::getEmojiConfig]
    emoji2[emoji-config::getEmojiArray]
    
    %% Entry layer
    main1[main::init]
    main2[main::handleInput]
    
    %% State layer
    state1[state::loadData]
    state2[state::update]
    
    %% Render layer
    render1[render::render]
    render2[render::renderTimeline]
    
    main1 --> state1
    state1 --> render1
    main2 --> state2
    state2 --> render1
    render1 --> render2
    render2 --> emoji1
```

## Test 4: Force vertical with invisible edges
```mermaid
graph TD
    subgraph Layer1["Utilities"]
        emoji_config["emoji-config"]
        label_layout["label-layout"]
    end
    
    subgraph Layer2["Main"]
        main["main.js"]
    end
    
    subgraph Layer3["State"]
        state["state.js"]
    end
    
    subgraph Layer4["Render"]
        render["render.js"]
    end
    
    Layer1 -.-> Layer2
    Layer2 -.-> Layer3
    Layer3 -.-> Layer4
    
    main --> state
    state --> render
    render --> emoji_config
```

## Test 5: Nested subgraphs
```mermaid
graph TD
    subgraph Application
        direction TB
        subgraph Utilities
            emoji[emoji-config]
            labels[label-layout]
        end
        
        subgraph Core
            main[main.js]
            state[state.js]
            render[render.js]
        end
    end
    
    main --> state
    state --> render
    render --> emoji
```