# Client Configuration System

Scalable, config-driven architecture for multi-client dashboard support.

## Quick Links

- **[Full Guide: Adding New Clients](../../ADDING_CLIENTS.md)** - Complete step-by-step instructions
- **Reference Implementation**: `kering/` folder

## Architecture

```
lib/clients/
├── index.ts          # Client registry, helpers & transform registration
├── types.ts          # TypeScript interfaces
├── transforms.ts     # Generic transform function (no client-specific code)
├── api.ts            # Generic API layer & client API registry
├── hooks/
│   └── useTableViewData.ts  # Generic data fetching hook
└── {client-name}/
    ├── index.ts      # Module exports
    ├── config.ts     # ClientConfig
    ├── schema.ts     # QueryBuilder field schema
    ├── tableView.ts  # TableViewConfig (columns, periods, brands)
    ├── api.ts        # ClientApiConfig (endpoints)
    └── transforms.ts # Client-specific transform configs (NEW!)
```

### Key Principle

**Client-specific code lives in client folders.** Core files only contain generic utilities and registration mechanisms.

## Adding a New Client (Summary)

1. Create `lib/clients/{client-name}/` directory
2. Create config files: `config.ts`, `schema.ts`, `tableView.ts`, `api.ts`, `transforms.ts`, `index.ts`
3. Register API config in `api.ts` → `clientApiRegistry`
4. Register client in `index.ts` → `clientRegistry`
5. Register transforms in `index.ts` → `registerTransforms()`
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

Config-driven data transformation with advanced features:

```typescript
const rows = transformDataWithConfig(apiData, transformConfig, periodFilter);
```

**Transform Features:**
- `useGrandTotalFromApi` - Use API's GRAND TOTAL instead of calculating
- `renameSecondOccurrence` - Handle duplicate values (e.g., "Digital" → "Digital Total")
- `skipDuplicates` - Remove duplicate occurrences
- `skipValues` - Exclude specific values from results

### Data Hook (`hooks/useTableViewData.ts`)

Unified data fetching that automatically uses the right API and transform based on client config.

## Files to Modify When Adding a Client

1. Create all files in `lib/clients/{client-name}/`
2. `api.ts` - Import and register client API config
3. `index.ts` - Import client module, register in `clientRegistry`, and call `registerTransforms()`
