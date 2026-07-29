# Architecture

```text
Navigateur React
    |
    | HTTPS / JWT
    v
API Express / TypeScript
    |-- contrôleurs : validation HTTP
    |-- services : règles métier et calculs actuariels
    |-- repositories : accès aux données
    |-- journal d’audit et génération PDF
    |
    +--> Supabase PostgreSQL / Auth
    +--> DGI, SIAPS, SMS selon configuration
```

Les taux métier sont versionnés par date d’effet. Le moteur actuariel ne dépend pas de l’interface et dispose de tests de non-régression fondés sur les classeurs de référence.

Les montants de prestations ne sont pas saisis librement : le compte est recalculé à partir des cotisations encaissées, puis le moteur applique la règle et les paramètres en vigueur. Les transitions de paiement sont contrôlées et inscrites dans l’audit.
