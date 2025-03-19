import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Creates a mock Axios error with the specified status code and message
 */
export function createAxiosError(
  status: number,
  message = 'Error message',
  code?: string,
  data?: unknown
): AxiosError {
  const config: AxiosRequestConfig = {
    url: 'https://api.example.com/test',
    method: 'get',
    headers: { 'Content-Type': 'application/json' }
  };

  // Create the error object with necessary properties
  const errorObject: any = new Error(message);
  errorObject.isAxiosError = true;
  errorObject.config = config;
  errorObject.code = code || (status ? 'ERR_BAD_RESPONSE' : 'ECONNABORTED');

  // Add response only for HTTP errors
  if (status) {
    errorObject.response = {
      data: data || { message },
      status,
      statusText: message,
      headers: { 'content-type': 'application/json' },
      config
    };
  }

  // Cast to AxiosError
  return errorObject as AxiosError;
}