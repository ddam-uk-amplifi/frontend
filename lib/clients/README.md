# Client Configuration System

Scalable, config-driven architecture for multi-client dashboard support.

## Quick Links

- **[Full Guide: Adding New Clients](../../ADDING_CLIENTS.md)** - Complete step-by-step instructions
- **Reference Implementation**: `kering/` folder

## Architecture

```
lib/clients/
├── index.ts          # Client registry & helper functions
├── types.ts          # TypeScript interfaces
├── transforms.ts     # Transform registry & generic transform function
├── api.ts            # Generic API layer & client API registry
├── hooks/
│   └── useTableViewData.ts  # Generic data fetching hook
└── {client-name}/
    ├── index.ts      # Module exports
    ├── config.ts     # ClientConfig
    ├── schema.ts     # QueryBuilder field schema
    ├── tableView.ts  # TableViewConfig (columns, periods, brands)
    └── api.ts        # ClientApiConfig (endpoints)
```

## Adding a New Client (Summary)

1. Create `lib/clients/{client-name}/` directory
2. Create config files: `config.ts`, `schema.ts`, `tableView.ts`, `api.ts`, `index.ts`
3. Add transforms to `transforms.ts` → `transformRegistry`
4. Register API config in `api.ts` → `clientApiRegistry`
5. Register client in `index.ts` → `clientRegistry`
6. Test all views

See **[ADDING_CLIENTS.md](../../ADDING_CLIENTS.md)** for detailed instructions and configuration reference.

## Current Clients

| Client | Slug | ID | Features |
|--------|------|----|----------|
| Arla | `arla` | 1 | Trackers, Inflation, Dynamic Fields |
| Kering | `kering` | 2 | Trackers, Brands, Summary, Full Config |
| Carlsberg | `carlsberg` | 3 | Basic config only |

## Key Concepts

### Generic API Layer (`api.ts`)

Config-driven API fetching - no client-specific fetch functions needed:

```typescript
const result = await fetchClientData(apiConfig, "summary", "default", { clientId, market });
```

### Transform System (`transforms.ts`)

Config-driven data transformation:

```typescript
const rows = transformDataWithConfig(apiData, transformConfig, periodFilter);
```

### Data Hook (`hooks/useTableViewData.ts`)

Unified data fetching that automatically uses the right API and transform based on client config.

## Files to Modify When Adding a Client

1. `transforms.ts` - Add transform configs to registry
2. `api.ts` - Import and register client API config
3. `index.ts` - Import and register client module
