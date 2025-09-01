DO NOT EDIT THE TIMELINE_OVERVIEW.MD FILE DIRECTLY (VS CODE SHOULD PREVENT YOU FROM DOING THIS)

To Update The Timeline, all you have to do is update the google sheet here: https://docs.google.com/spreadsheets/d/1bWhPrr24PIH6akVZ4qCivV8nvB2fUcO2vTu3l6RG-Zs/edit?usp=sharing

If VS Code is running with this workspace loaded, a python script will be listening and converting changes to the .gsheet file to the !!42_Mill_St_Timeline_Overview.md file that then feeds the Timeline.  Booyakasha

If you need to install Python, you can do it from the microsoft store or python.org
You'll also need watchdog

## Timeline Emoji System

The timeline visualization uses emojis in the **Mrkr** column to determine event types and appearance:

### Timeline Events (Regular Timeline)
- 🟢 = Green public event on timeline
- 🔒🟢 = Red private event on timeline  
- ❌ = Missing document indicator (appears with other markers)

### Caseline Events (Procedural Timeline)
These emojis create nodes on the case-specific procedural timeline:
- ⭐ = Filing/Application (no default label - use **LABEL** in Procedural Step)
- ✅ = Approved (label: "APPROVED")
- ⛔ = Denied (label: "DENIED")
- 📐 = Plan Submitted (label: "PLAN")
- 🔍 = Peer Review (label: "REVIEW")
- 🐢 = Continued Hearing (no label)
- 🏛️ = Public Hearing (label: "HEARING")
- ⏰ = Expired (label: "EXPIRED")
- ♻️ = Extended (label: "EXTENDED")
- 🔒 + any above = Private version (shows 🔒 as node)

**Label Override:** Any recognized emoji can have its label overridden by including **LABEL** in the Procedural Step column. For example:
- ⭐ with **RDA** → shows "RDA" as label
- ⭐ with **ANRAD** → shows "ANRAD" as label
- ⭐ with **SORAD** → shows "SORAD" as label

**Template:**
| YYYY-MM-DD | [Doc Title](https://github.com/tdemelle-SiP/bakers_pond/blob/master/Dated%20Documents/Doc%20Link.pdf) | #(DEP case number) | 🟢 | (** Caseline Node Label **) | (Analysis) | (Notes) |

**Note:** For unrecognized emojis, the emoji becomes the node icon and the label is extracted from **LABEL** in the Procedural Step column.
