export const templates = [
    {
        name: 'Daily Journal',
        content: `# Daily Journal - ${new Date().toLocaleDateString()}

## 📅 Goals for Today
- [ ] 
- [ ] 
- [ ] 

## 📝 Notes
- 

## 🧠 Thoughts & Reflections
> 

##  কৃতজ্ঞ Gratitude
1. 
2. 
3. 
`
    },
    {
        name: 'Bug Report',
        content: `# 🐛 Bug Report

## Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- **OS:** [e.g. Windows 10]
- **Browser:** [e.g. Chrome, Safari]
- **Version:** [e.g. 22]
`
    },
    {
        name: 'Meeting Notes',
        content: `# 📅 Meeting Notes

**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 

## 🗣️ Agenda
1. 
2. 
3. 

## 📝 Discussion Points
- 

## ✅ Action Items
- [ ] @Person: Task description
- [ ] @Person: Task description
`
    },
    {
        name: 'Code Snippet',
        content: `\`\`\`javascript
// Your code here
function example() {
  console.log("Hello World");
}
\`\`\`
`
    },
    {
        name: 'Mermaid - Flowchart',
        content: `\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`
`
    },
    {
        name: 'Mermaid - Sequence Diagram',
        content: `\`\`\`mermaid
sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!
    Alice-)John: See you later!
\`\`\`
`
    },
    {
        name: 'Mermaid - Class Diagram',
        content: `\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal: +int age
    Animal: +String gender
    Animal: +isMammal()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
\`\`\`
`
    },
    {
        name: 'Mermaid - State Diagram',
        content: `\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\`
`
    },
    {
        name: 'Mermaid - Gantt Chart',
        content: `\`\`\`mermaid
gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: a1, 2024-01-01, 30d
    Task 2: after a1, 20d
    section Phase 2
    Task 3: 2024-02-20, 25d
    Task 4: 20d
\`\`\`
`
    },
    {
        name: 'Mermaid - ER Diagram',
        content: `\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string custNumber
        string sector
    }
    ORDER {
        int orderNumber
        string deliveryAddress
    }
    LINE-ITEM {
        string productCode
        int quantity
        float pricePerUnit
    }
\`\`\`
`
    },
    {
        name: 'Mermaid - User Journey',
        content: `\`\`\`mermaid
journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me
\`\`\`
`
    },
    {
        name: 'Mermaid - Git Graph',
        content: `\`\`\`mermaid
gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
\`\`\`
`
    },
    {
        name: 'Mermaid - Pie Chart',
        content: `\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs": 386
    "Cats": 85
    "Rats": 15
\`\`\`
`
    }
];
