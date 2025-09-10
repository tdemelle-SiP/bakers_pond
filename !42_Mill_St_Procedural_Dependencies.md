# Procedural Dependencies

## Planning Phase by Agency

#### Conservation Commission
```mermaid
flowchart LR
    subgraph ConCom ["<b>CONSERVATION COMMISSION</b>"]
        direction LR
        Delin[ORAD]
        ORADExpired{ORAD<br/>Expired?}
        ORADApp[ORAD<br/>Application]
        ORADApprove{ORAD<br/>Approved?}
        ORADRevise[Revise<br/>ORAD]
        DamNOI[Dam NOI<br/>Filing]
        DamOOC[ConCom<br/>Review]
        OwnerChallenge{Ownership<br/>Challenge?}
        Survey[Contract<br/>Surveyor]
        OnProperty{Dam on<br/>Property?}
        NoStanding[No Standing<br/>Process Ends]
        DamApprove{NOI<br/>Approved?}
        DamSOC[DEP<br/>Appeal]
        DEPApprove{DEP<br/>Approves?}
        NoStanding2[Process<br/>Ends]
        DamOOC_Final([Dam<br/>OOC])
    end
    
    Delin --> ORADExpired
    ORADExpired -->|No| DamNOI
    ORADExpired -->|Yes| ORADApp
    ORADApp --> ORADApprove
    ORADApprove -->|Yes| DamNOI
    ORADApprove -->|No| ORADRevise
    ORADRevise --> ORADApp
    DamNOI --> DamOOC
    DamOOC --> OwnerChallenge
    OwnerChallenge -->|Yes| Survey
    OwnerChallenge -->|No| DamApprove
    Survey --> OnProperty
    OnProperty -->|Yes| DamApprove
    OnProperty -->|No| NoStanding
    DamApprove -->|No| DamSOC
    DamApprove -->|Yes| DamOOC_Final
    DamSOC --> DEPApprove
    DEPApprove -->|Yes| DamOOC_Final
    DEPApprove -->|No| NoStanding2
    
    style DamNOI fill:#bbf
    style ORADApp fill:#bbf
    style ORADExpired fill:#fbb
    style ORADApprove fill:#fbb
    style OwnerChallenge fill:#fbb
    style OnProperty fill:#fbb
    style DamApprove fill:#fbb
    style DEPApprove fill:#fbb
    style DamOOC_Final fill:#9f9,stroke:#333,stroke-width:3px
    style ConCom fill:#e6f3ff
```

#### Planning Board & Building Department
```mermaid
flowchart LR
    subgraph Planning ["<b>PLANNING BOARD</b>"]
        direction LR
        ANR[ANR<br/>Filing]
        ANRApprove{ANR<br/>Approved?}
        ANRRevise[Revise<br/>ANR]
    end
    
    subgraph Building ["<b>BUILDING DEPARTMENT</b>"]
        direction LR
        BP[Building Permit<br/>Application]
        BPReview[Plan<br/>Review]
        BPApprove{Permit<br/>Approved?}
        BPRevise[Revise<br/>Plans]
        BPFinal([Final<br/>Permit])
    end
    
    ANR --> ANRApprove
    ANRApprove -->|Yes| BP
    ANRApprove -->|No| ANRRevise
    ANRRevise --> ANR
    BP --> BPReview
    BPReview --> BPApprove
    BPApprove -->|Yes| BPFinal
    BPApprove -->|No| BPRevise
    BPRevise --> BP
    
    style ANR fill:#bbf
    style BP fill:#bbf
    style ANRApprove fill:#fbb
    style BPApprove fill:#fbb
    style BPFinal fill:#9f9,stroke:#333,stroke-width:3px
    style Planning fill:#fff0e6
    style Building fill:#f0e6ff
```

### Implementation Phase
```mermaid
flowchart LR
    Both{Permit &<br/>OOC Issued?}
    DamWork[Dam<br/>Repair]
    DamComplete[Complete<br/>Dam]
    DamCOC[Dam<br/>COC]
    House[House<br/>Dev]
    HouseCOC[House<br/>COC]
    
    Both -->|Yes| DamWork
    DamWork --> DamComplete
    DamComplete --> DamCOC
    DamCOC --> House
    House --> HouseCOC
    
    style Both fill:#fbb
    style DamWork fill:#bfb
```

## Legend
- Blue: Permit Applications
- Red: Decision Points
- Green: Construction Phase / Final Approvals