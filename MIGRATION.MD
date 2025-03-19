# Migration Guide

This guide will help you migrate from your current implementation to the new professional Aegis error handling library.

## Comparing Original vs. New Code

### Original Code

```typescript
// Original version
export function handleError(
  error: unknown,
  errorConfig?: ErrorConfigMap,
  callback?: (errorMessage: string, duration: number) => void
) {
  const errorHandler = createErrorHandler(errorConfig);
  const errorMessage = errorHandler.handle(error);
  const duration = calculateToastDuration(errorMessage);
  callback && callback(errorMessage, duration);
  return errorMessage;
}
```

### New Code

```typescript
// Enhanced version
export function handleError(
  error: unknown,
  customConfigs?: ErrorConfigMap,
  callback?: (result: ErrorResult) => void
) {
  const errorHandler = createErrorHandler(undefined, customConfigs);
  const result = errorHandler.handle(error);

  if (callback) {
    callback(result);
  }

  return result;
}
```

## Migration Steps

### 1. Install the New Library

```bash
npm install aegis
# or
yarn add aegis
```

### 2. Replace Imports

#### Before:

```typescript
import {
  ErrorHandler,
  createErrorHandler,
  handleError,
  calculateToastDuration,
} from "./utils/errorHandler";
```

#### After:

```typescript
import {
  ErrorHandler,
  createErrorHandler,
  handleError,
  calculateToastDuration,
} from "aegis";
```

### 3. Update Error Handler Configuration

#### Before:

```typescript
const errorHandler = createErrorHandler({
  unauthorized: {
    message: "Your session has expired. Please log in again.",
  },
  "network-error": {
    message:
      "Unable to connect to the server. Please check your internet connection.",
  },
});
```

#### After:

```typescript
const errorHandler = createErrorHandler(
  // Default configuration (optional)
  {
    message: "An unexpected error has occurred. Please try again.",
  },
  // Specific configurations
  {
    unauthorized: {
      message: "Your session has expired. Please log in again.",
      severity: "warning",
    },
    "network-error": {
      message:
        "Unable to connect to the server. Please check your internet connection.",
      severity: "error",
    },
  }
);
```

### 4. Update Error Handling

#### Before:

```typescript
try {
  // Operation that might fail
} catch (error) {
  const errorMessage = handleError(error, {}, (message, duration) => {
    toast.error(message, {
      position: "top-center",
      closeButton: true,
      duration: duration,
    });
  });
}
```

#### After:

```typescript
try {
  // Operation that might fail
} catch (error) {
  handleError(error, {}, (result) => {
    toast.error(result.message, {
      position: "top-center",
      closeButton: true,
      duration: result.duration,
    });

    if (result.errorVerb === "unauthorized") {
      // Additional specific actions
      redirectToLogin();
    }
  });
}
```

### 5. Integrate with React Query

#### Before:

```typescript
import { useQuery } from "react-query";

const errorHandler = createErrorHandler({
  unauthorized: {
    message: "Your session has expired. Please log in again.",
  },
});

const useUserData = (userId: string) => {
  return useQuery(["user", userId], fetchUserData, {
    onError: (error) => {
      const message = errorHandler.handle(error);
      console.error(`Error in query fetchUserData:`, message, error);
      toast.error(message);
    },
  });
};
```

#### After:

```typescript
import { useQuery } from "@tanstack/react-query";
import { createErrorHandler, createReactQueryErrorHandler } from "aegis";

const errorHandler = createErrorHandler(undefined, {
  unauthorized: {
    message: "Your session has expired. Please log in again.",
  },
});

const queryErrorHandler = createReactQueryErrorHandler({
  errorHandler,
  showToast: (message, options) => {
    toast.error(message, {
      duration: options?.duration,
      position: "top-center",
    });
  },
});

const useUserData = (userId: string) => {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUserData(userId),
    onError: queryErrorHandler.createErrorHandler("fetchUserData"),
  });
};
```

## Key Differences

1. **More Information in Results**: The new library returns a complete `ErrorResult` object instead of just a text message.

2. **Built-in Adapters**: No need to write specific logic for Axios anymore, there are adapters for multiple libraries.

3. **Better Integrations**: Specific integrations for React Query, SWR, and other libraries.

4. **Extended Metadata**: More information about each error, including severity, reporting data, etc.

5. **Enhanced Logging System**: Configuration to determine which errors are logged and how.

## Common Pattern Examples

### Centralizing Configuration

```typescript
// src/utils/errorHandler.ts
import { createErrorHandler, createReactQueryErrorHandler } from "aegis";
import { toast } from "your-toast-library";

// Create a shared errorHandler
export const errorHandler = createErrorHandler(
  { message: "Something went wrong" },
  {
    unauthorized: {
      message: "Session expired",
      action: () => {
        /* redirect to login */
      },
    },
  }
);

// Create a utility function to handle errors
export function handleAppError(error: unknown, customMessage?: string) {
  const result = errorHandler.handle(error);
  toast.error(customMessage || result.message, { duration: result.duration });
  return result;
}

// Configure React Query
export const queryErrorHandler = createReactQueryErrorHandler({
  errorHandler,
  showToast: (message, options) => {
    toast.error(message, { duration: options?.duration });
  },
});
```

### Usage in Components

```tsx
import { handleAppError } from "../utils/errorHandler";

function MyComponent() {
  const handleSubmit = async (data) => {
    try {
      await submitForm(data);
    } catch (error) {
      handleAppError(error);
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Usage with APIs

```typescript
import { handleAppError } from "../utils/errorHandler";

export async function fetchDataWithErrorHandling() {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) {
      throw response;
    }
    return await response.json();
  } catch (error) {
    handleAppError(error);
    return null;
  }
}
```
