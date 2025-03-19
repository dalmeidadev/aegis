# Aegis

A professional library for handling errors in frontend applications with support for multiple HTTP libraries and frameworks.

## Features

- 🔄 Compatible with multiple HTTP libraries (Axios, Fetch)
- 🔌 Integrations with popular libraries (React Query, SWR)
- 🔧 Extensible through custom adapters
- 📋 Easy and flexible configuration
- 📊 Support for different severity levels
- 📝 Enhanced logging system
- 🔍 Extensible metadata for each error type
- 🚦 Automatic duration calculation for toast messages
- 🌐 Full TypeScript support

## Installation

```bash
npm install aegis
# or
yarn add aegis
```

## Basic Usage

### Creating an Error Handler

```typescript
import { createErrorHandler } from "aegis";

// Create an error handler with default configuration
const errorHandler = createErrorHandler();

// Use the error handler
try {
  // Code that might throw an error
} catch (error) {
  const result = errorHandler.handle(error);
  console.error(result.message);

  // Show a toast, for example
  showToast(result.message, { duration: result.duration });
}
```

### Custom Configuration

```typescript
import { createErrorHandler } from "aegis";

// Create an error handler with custom configurations
const errorHandler = createErrorHandler(
  // Default configuration
  {
    message: "Something went wrong. Please try again later.",
    severity: "error",
  },
  // Specific configurations by error type
  {
    unauthorized: {
      message: "Your session has expired. Please log in again.",
      action: () => {
        redirectToLogin();
      },
    },
    "network-error": {
      message:
        "Unable to connect to the server. Please check your internet connection.",
      severity: "warning",
    },
  }
);
```

### Convenience Function

```typescript
import { handleError } from "aegis";
import { toast } from "your-toast-library";

try {
  // Code that might throw an error
} catch (error) {
  handleError(error, {}, (result) => {
    toast.error(result.message, {
      duration: result.duration,
    });
  });
}
```

## React Query Integration

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createErrorHandler, createReactQueryErrorHandler } from "aegis";
import { toast } from "your-toast-library";

// Create the error handler
const errorHandler = createErrorHandler();

// Create the React Query integration
const queryErrorHandler = createReactQueryErrorHandler({
  errorHandler,
  showToast: (message, options) => {
    toast.error(message, {
      duration: options?.duration,
      position: "top-center",
    });
  },
});

// Configure QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: queryErrorHandler.shouldRetry,
      onError: queryErrorHandler.createErrorHandler("global"),
    },
    mutations: {
      onError: queryErrorHandler.createErrorHandler("global-mutation"),
    },
  },
});

// In a specific component
const { data } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  onError: queryErrorHandler.createErrorHandler("fetchUsers"),
});
```

## SWR Integration

```typescript
import { SWRConfig } from "swr";
import { createErrorHandler, createSWRErrorHandler } from "aegis";
import { toast } from "your-toast-library";

// Create the error handler
const errorHandler = createErrorHandler();

// Create the SWR integration
const swrErrorHandler = createSWRErrorHandler({
  errorHandler,
  showToast: (message, options) => {
    toast.error(message, {
      duration: options?.duration,
      position: "top-center",
    });
  },
});

// Configure SWR
function MyApp({ Component, pageProps }) {
  return (
    <SWRConfig
      value={{
        onError: swrErrorHandler,
      }}
    >
      <Component {...pageProps} />
    </SWRConfig>
  );
}
```

## Complete API

### ErrorHandler

The main class for handling errors.

```typescript
const errorHandler = new ErrorHandler({
  defaultConfig: {
    /* ... */
  },
  configs: {
    /* ... */
  },
  logger: (message, error, metadata) => {
    /* ... */
  },
  logLevel: "error",
  logAllErrors: false,
});
```

#### Methods

- `configure(configs)`: Configures custom error messages and actions.
- `setDefaultConfig(config)`: Configures the default error handling.
- `registerAdapter(adapter)`: Registers a custom error adapter.
- `handle(error)`: Handles an error and returns the appropriate result.
- `createQueryErrorHandler(queryName, onError)`: Creates an error handler for React Query.

### Adapters

Adapters allow the library to handle errors from different sources.

```typescript
// Using predefined adapters
import { axiosAdapter, fetchAdapter } from "aegis";

errorHandler.registerAdapter(axiosAdapter);
errorHandler.registerAdapter(fetchAdapter);

// Creating a custom adapter
const myCustomAdapter = {
  name: "MyCustomAdapter",
  canHandle: (error) => error instanceof MyCustomError,
  getErrorVerb: (error) => {
    const customError = error as MyCustomError;
    return customError.code === "AUTH_FAILED" ? "unauthorized" : "unknown";
  },
  extractMetadata: (error) => ({
    code: error.code,
    details: error.details,
  }),
};

errorHandler.registerAdapter(myCustomAdapter);
```

## Advanced Examples

### Custom Logging

```typescript
import { ErrorHandler } from "aegis";

const errorHandler = new ErrorHandler({
  logger: (message, error, metadata) => {
    // Send to a monitoring service
    myMonitoringService.captureError(error, {
      message,
      ...metadata,
    });

    // Also log locally
    console.error(message, error, metadata);
  },
  logLevel: "warning", // Log 'warning', 'error' and 'critical'
  logAllErrors: true, // Log all errors even if they're handled
});
```

### Environment-based Configuration

```typescript
import { createErrorHandler } from "aegis";

const isDevelopment = process.env.NODE_ENV === "development";

const errorHandler = createErrorHandler(
  {
    message: "An unexpected error has occurred.",
    severity: "error",
  },
  {
    "server-error": {
      message: isDevelopment
        ? "Server Error: Check the console for more details."
        : "We are experiencing technical difficulties. Please try again later.",
      action: isDevelopment
        ? () => {
            console.log("⚠️ Server Error - Check network and logs");
          }
        : undefined,
    },
  }
);
```

## Supported Error Types

- `not-found`: Resource not found (404)
- `unauthorized`: Not authenticated (401)
- `forbidden`: No permission (403)
- `bad-request`: Invalid request (400)
- `server-error`: Server error (500, 501, 502, 503)
- `network-error`: Network error
- `timeout`: Request timeout (408, 504)
- `conflict`: Conflict with current state (409)
- `too-many-requests`: Rate limit exceeded (429)
- `unprocessable-entity`: Unprocessable entity (422)
- `cancelled`: Cancelled request
- `unknown`: Unknown error

## License

MIT
